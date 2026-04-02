import logging
import queue
import threading
import time
import tkinter as tk
from tkinter import filedialog, messagebox, scrolledtext, ttk

from tradetron import (
    CryptoTradingBot,
    load_bot_config_file,
    resolve_config_path,
    save_bot_config_file,
)


class QueueLogHandler(logging.Handler):
    def __init__(self, event_queue: queue.Queue):
        super().__init__(level=logging.INFO)
        self.event_queue = event_queue
        self.setFormatter(logging.Formatter('%(asctime)s - %(levelname)s - %(message)s'))

    def emit(self, record: logging.LogRecord):
        try:
            self.event_queue.put(("log", self.format(record)))
        except Exception:
            pass


class TradeTronDashboard:
    MODEL_FIELDS = [
        ("symbol", "Symbol", "string"),
        ("timeframe", "Timeframe", "string"),
        ("sma_short", "SMA Short", "int"),
        ("sma_long", "SMA Long", "int"),
        ("rsi_period", "RSI Period", "int"),
        ("buy_score_threshold", "Buy Threshold", "float"),
        ("sell_score_threshold", "Sell Threshold", "float"),
        ("min_signal_confidence", "Min Confidence", "float"),
        ("volume_surge_threshold", "Volume Surge", "float"),
        ("min_volume", "Min Quote Volume", "float"),
    ]
    RISK_FIELDS = [
        ("position_sizing_method", "Sizing Method", "choice"),
        ("position_size", "Fallback Size", "float"),
        ("risk_per_trade", "Risk / Trade", "float"),
        ("max_position_size", "Max Position", "float"),
        ("min_position_size", "Min Position", "float"),
        ("stop_loss", "Base Stop", "float"),
        ("take_profit", "Take Profit", "float"),
        ("atr_stop_multiple", "ATR Stop x", "float"),
        ("trailing_stop_multiple", "Trail Stop x", "float"),
        ("max_daily_loss", "Max Daily Loss", "float"),
        ("max_concurrent_trades", "Max Trades", "int"),
        ("max_portfolio_exposure", "Max Portfolio Exposure", "float"),
        ("max_symbol_exposure", "Max Symbol Exposure", "float"),
        ("check_interval", "Check Interval", "int"),
        ("paper_fee_rate", "Paper Fee", "float"),
        ("paper_slippage_bps", "Paper Slip bps", "float"),
    ]
    BOOL_FIELDS = [
        ("trading_enabled", "Trading Enabled"),
        ("enable_paper_trading", "Paper Trading"),
        ("use_volatility_filter", "Volatility Gate"),
        ("use_trend_filter", "Trend Gate"),
        ("email_notifications", "Email Alerts"),
    ]
    CARD_FIELDS = [
        "Readiness",
        "Directive",
        "Regime",
        "Risk Posture",
        "Current Price",
        "Would Buy At",
        "Portfolio Value",
        "Paper Cash",
        "Paper Inventory",
        "Exposure",
        "Open Positions",
        "Buy Score",
        "Sell Score",
        "Confidence",
        "Rec. Size",
        "Total Trades",
        "Win Rate",
        "Daily Loss",
        "Max Drawdown",
        "Paper Fees",
        "Paper P&L",
        "Why Hold",
    ]

    def __init__(self, config_file: str = "bot_config.json", exchange_name: str = "coinbase"):
        self.root = tk.Tk()
        self.root.title("TradeTron Round 2 Command Center")
        self.root.geometry("1680x1020")
        self.root.minsize(1360, 860)
        self.root.configure(bg="#071311")
        self.root.protocol("WM_DELETE_WINDOW", self.on_close)

        self.colors = {
            "bg": "#071311",
            "panel": "#102620",
            "panel_alt": "#16342c",
            "panel_soft": "#1b4036",
            "text": "#f0f4ef",
            "muted": "#9cb8ac",
            "accent": "#9be37c",
            "accent_alt": "#e4c06a",
            "alert": "#ff8e72",
            "border": "#32594d",
        }

        self.event_queue = queue.Queue()
        self.log_handler = QueueLogHandler(self.event_queue)
        self.bot = None
        self.bot_thread = None
        self.connect_thread = None
        self.snapshot_thread = None
        self.last_snapshot_at = 0.0

        self.config_path_var = tk.StringVar(value=config_file)
        self.exchange_var = tk.StringVar(value=exchange_name)
        self.api_key_var = tk.StringVar()
        self.api_secret_var = tk.StringVar()
        self.connection_var = tk.StringVar(value="Disconnected")
        self.mode_var = tk.StringVar(value="Idle")
        self.readiness_var = tk.StringVar(value="STANDBY")
        self.directive_var = tk.StringVar(value="Directive: HOLD")
        self.status_headline_var = tk.StringVar(value="Step 1: Connect market data")
        self.status_detail_var = tk.StringVar(value="Enable Paper Trading, choose coinbase or kraken, then click Connect Market Data.")

        self.form_vars = {}
        for field_name, _, _ in [*self.MODEL_FIELDS, *self.RISK_FIELDS]:
            self.form_vars[field_name] = tk.StringVar()
        for field_name, _ in self.BOOL_FIELDS:
            self.form_vars[field_name] = tk.BooleanVar(value=False)

        self.card_vars = {field: tk.StringVar(value="--") for field in self.CARD_FIELDS}
        self.card_vars["Open Positions"].set("0")
        self.card_vars["Total Trades"].set("0")

        self._configure_styles()
        self._build_ui()
        self._load_form_config(config_file)
        self._append_log("TradeTron round two command center ready.")
        self._refresh_status_banner()
        self._update_buttons()
        self._tick()

    def _configure_styles(self):
        style = ttk.Style(self.root)
        style.theme_use("clam")
        style.configure("Root.TFrame", background=self.colors["bg"])
        style.configure("Deck.TFrame", background=self.colors["panel"])
        style.configure("Card.TLabelframe", background=self.colors["panel"], foreground=self.colors["text"], bordercolor=self.colors["border"])
        style.configure("Card.TLabelframe.Label", background=self.colors["panel"], foreground=self.colors["text"], font=("Segoe UI Semibold", 11))
        style.configure("Deck.TNotebook", background=self.colors["bg"], borderwidth=0, tabmargins=(0, 0, 0, 10))
        style.configure("Deck.TNotebook.Tab", background=self.colors["panel_alt"], foreground=self.colors["muted"], padding=(16, 9), font=("Segoe UI Semibold", 10))
        style.map("Deck.TNotebook.Tab", background=[("selected", self.colors["panel"])], foreground=[("selected", self.colors["text"])])
        style.configure("Body.TLabel", background=self.colors["panel"], foreground=self.colors["text"], font=("Segoe UI", 10))
        style.configure("Muted.TLabel", background=self.colors["panel"], foreground=self.colors["muted"], font=("Segoe UI", 9))
        style.configure("Deck.TEntry", fieldbackground="#0d1b17", foreground=self.colors["text"], bordercolor=self.colors["border"], insertcolor=self.colors["text"])
        style.configure("Deck.TCombobox", fieldbackground="#0d1b17", foreground=self.colors["text"], bordercolor=self.colors["border"])
        style.configure("Accent.TButton", background=self.colors["accent"], foreground="#08110d", padding=(13, 9), font=("Segoe UI Semibold", 10))
        style.map("Accent.TButton", background=[("active", "#b2f38b")])
        style.configure("Ghost.TButton", background=self.colors["panel_alt"], foreground=self.colors["text"], padding=(13, 9), font=("Segoe UI Semibold", 10))
        style.map("Ghost.TButton", background=[("active", self.colors["panel_soft"])])
        style.configure("Alert.TButton", background=self.colors["alert"], foreground="#250f0c", padding=(13, 9), font=("Segoe UI Semibold", 10))
        style.map("Alert.TButton", background=[("active", "#ffad98")])
        style.configure("Deck.TCheckbutton", background=self.colors["panel"], foreground=self.colors["text"], font=("Segoe UI", 10))

    def _build_ui(self):
        outer = ttk.Frame(self.root, style="Root.TFrame", padding=18)
        outer.pack(fill="both", expand=True)

        self._build_hero(outer)
        self._build_status_strip(outer)

        content = tk.Frame(outer, bg=self.colors["bg"])
        content.pack(fill="both", expand=True)
        content.columnconfigure(0, weight=0)
        content.columnconfigure(1, weight=1)
        content.rowconfigure(0, weight=1)

        left = tk.Frame(content, bg=self.colors["bg"])
        left.grid(row=0, column=0, sticky="nsew", padx=(0, 16))
        left.columnconfigure(0, weight=1)
        left.rowconfigure(0, weight=1)

        right = tk.Frame(content, bg=self.colors["bg"])
        right.grid(row=0, column=1, sticky="nsew")
        right.columnconfigure(0, weight=1)
        right.rowconfigure(0, weight=0)
        right.rowconfigure(1, weight=0)
        right.rowconfigure(2, weight=1)

        self._build_left_panel(left)
        self._build_right_panel(right)

    def _build_hero(self, parent):
        hero = tk.Frame(parent, bg=self.colors["bg"])
        hero.pack(fill="x", pady=(0, 16))
        hero.columnconfigure(0, weight=1)
        hero.columnconfigure(1, weight=0)

        copy_block = tk.Frame(hero, bg=self.colors["bg"])
        copy_block.grid(row=0, column=0, sticky="w")
        tk.Label(copy_block, text="TradeTron Round 2", bg=self.colors["bg"], fg=self.colors["text"], font=("Segoe UI Semibold", 28)).pack(anchor="w")
        tk.Label(copy_block, text="Institutional command center for scored execution, preflight discipline, and executive oversight.", bg=self.colors["bg"], fg=self.colors["muted"], font=("Segoe UI", 11)).pack(anchor="w", pady=(4, 0))

        badge = tk.Frame(hero, bg=self.colors["panel_alt"], highlightbackground=self.colors["border"], highlightthickness=1, padx=14, pady=10)
        badge.grid(row=0, column=1, sticky="e")
        tk.Label(badge, text="MISSION READINESS", bg=self.colors["panel_alt"], fg=self.colors["muted"], font=("Segoe UI", 9)).pack(anchor="e")
        tk.Label(badge, textvariable=self.readiness_var, bg=self.colors["panel_alt"], fg=self.colors["accent"], font=("Segoe UI Semibold", 16)).pack(anchor="e")
        tk.Label(badge, textvariable=self.directive_var, bg=self.colors["panel_alt"], fg=self.colors["accent_alt"], font=("Segoe UI", 10)).pack(anchor="e", pady=(2, 0))

    def _build_status_strip(self, parent):
        status_strip = tk.Frame(parent, bg=self.colors["panel_alt"], highlightbackground=self.colors["border"], highlightthickness=1, padx=16, pady=12)
        status_strip.pack(fill="x", pady=(0, 16))
        status_strip.columnconfigure(0, weight=1)

        tk.Label(status_strip, textvariable=self.status_headline_var, bg=self.colors["panel_alt"], fg=self.colors["accent"], font=("Segoe UI Semibold", 15)).grid(row=0, column=0, sticky="w")
        tk.Label(status_strip, textvariable=self.status_detail_var, bg=self.colors["panel_alt"], fg=self.colors["text"], font=("Segoe UI", 10), wraplength=1450, justify="left").grid(row=1, column=0, sticky="w", pady=(4, 0))

    def _build_left_panel(self, parent):
        notebook = ttk.Notebook(parent, style="Deck.TNotebook")
        notebook.grid(row=0, column=0, sticky="nsew", pady=(0, 12))

        session_tab = ttk.Frame(notebook, style="Deck.TFrame", padding=6)
        model_tab = ttk.Frame(notebook, style="Deck.TFrame", padding=6)
        risk_tab = ttk.Frame(notebook, style="Deck.TFrame", padding=6)
        notebook.add(session_tab, text="Session")
        notebook.add(model_tab, text="Signal Model")
        notebook.add(risk_tab, text="Risk Envelope")

        self._build_session_tab(session_tab)
        self._build_field_tab(model_tab, "Model Controls", self.MODEL_FIELDS)
        self._build_field_tab(risk_tab, "Risk Controls", self.RISK_FIELDS)

        actions = ttk.LabelFrame(parent, text="Run Controls", style="Card.TLabelframe", padding=14)
        actions.grid(row=1, column=0, sticky="ew")
        actions.columnconfigure(0, weight=1)
        actions.columnconfigure(1, weight=1)

        self.connect_button = ttk.Button(actions, text="Connect Market Data", style="Accent.TButton", command=self.connect_bot)
        self.save_button = ttk.Button(actions, text="Save Settings", style="Ghost.TButton", command=self.save_config)
        self.start_button = ttk.Button(actions, text="Start Auto Trading", style="Accent.TButton", command=self.start_bot)
        self.stop_button = ttk.Button(actions, text="Stop Auto Trading", style="Alert.TButton", command=self.stop_bot)
        self.refresh_button = ttk.Button(actions, text="Refresh Analysis", style="Ghost.TButton", command=self.refresh_snapshot)
        self.export_button = ttk.Button(actions, text="Export Report", style="Ghost.TButton", command=self.export_report)

        buttons = [
            self.connect_button,
            self.save_button,
            self.start_button,
            self.stop_button,
            self.refresh_button,
            self.export_button,
        ]
        for index, button in enumerate(buttons):
            button.grid(row=index // 2, column=index % 2, sticky="ew", padx=6, pady=6)

    def _build_session_tab(self, parent):
        card = ttk.LabelFrame(parent, text="Mission Session", style="Card.TLabelframe", padding=14)
        card.pack(fill="both", expand=True)
        card.columnconfigure(1, weight=1)

        self._add_entry(card, 0, "Exchange", self.exchange_var)
        self._add_entry(card, 1, "API Key", self.api_key_var)
        self._add_entry(card, 2, "API Secret", self.api_secret_var, show="*")
        self._add_entry(card, 3, "Config File", self.config_path_var)
        ttk.Button(card, text="Browse", style="Ghost.TButton", command=self._browse_config).grid(row=3, column=2, sticky="ew", padx=(8, 0))
        ttk.Label(card, text="API fields are optional when Paper Trading is enabled.", style="Muted.TLabel").grid(row=4, column=0, columnspan=3, sticky="w", pady=(4, 0))

        mode_frame = ttk.LabelFrame(card, text="Execution Modes", style="Card.TLabelframe", padding=12)
        mode_frame.grid(row=5, column=0, columnspan=3, sticky="ew", pady=(14, 0))
        for index, (field_name, label) in enumerate(self.BOOL_FIELDS):
            ttk.Checkbutton(mode_frame, text=label, variable=self.form_vars[field_name], style="Deck.TCheckbutton").grid(row=index // 2, column=index % 2, sticky="w", padx=(0, 16), pady=4)

        status_band = tk.Frame(card, bg=self.colors["panel"], pady=10)
        status_band.grid(row=6, column=0, columnspan=3, sticky="ew", pady=(14, 0))
        status_band.columnconfigure(0, weight=1)
        status_band.columnconfigure(1, weight=1)

        for column, (label, variable, color) in enumerate(
            (
                ("Connection", self.connection_var, self.colors["accent"]),
                ("State", self.mode_var, self.colors["accent_alt"]),
            )
        ):
            tile = tk.Frame(status_band, bg=self.colors["panel_alt"], highlightbackground=self.colors["border"], highlightthickness=1)
            tile.grid(row=0, column=column, sticky="ew", padx=(0 if column == 0 else 8, 0))
            tk.Label(tile, text=label, bg=self.colors["panel_alt"], fg=self.colors["muted"], font=("Segoe UI", 9)).pack(anchor="w", padx=10, pady=(8, 2))
            tk.Label(tile, textvariable=variable, bg=self.colors["panel_alt"], fg=color, font=("Segoe UI Semibold", 12)).pack(anchor="w", padx=10, pady=(0, 8))

    def _build_field_tab(self, parent, title, field_specs):
        card = ttk.LabelFrame(parent, text=title, style="Card.TLabelframe", padding=14)
        card.pack(fill="both", expand=True)
        card.columnconfigure(1, weight=1)
        card.columnconfigure(3, weight=1)

        for index, (field_name, label, field_type) in enumerate(field_specs):
            row = index // 2
            column_offset = 0 if index % 2 == 0 else 2
            ttk.Label(card, text=label, style="Body.TLabel").grid(row=row, column=column_offset, sticky="w", pady=6)
            if field_type == "choice":
                control = ttk.Combobox(card, textvariable=self.form_vars[field_name], values=["fixed", "risk_adjusted"], state="readonly", style="Deck.TCombobox")
            else:
                control = ttk.Entry(card, textvariable=self.form_vars[field_name], style="Deck.TEntry")
            control.grid(row=row, column=column_offset + 1, sticky="ew", padx=(0, 14 if column_offset == 0 else 0), pady=6)

    def _build_right_panel(self, parent):
        cards = ttk.LabelFrame(parent, text="Mission Snapshot", style="Card.TLabelframe", padding=14)
        cards.grid(row=0, column=0, sticky="ew", pady=(0, 14))
        for column in range(5):
            cards.columnconfigure(column, weight=1)

        for index, field_name in enumerate(self.CARD_FIELDS):
            tile = tk.Frame(cards, bg=self.colors["panel_alt"], highlightbackground=self.colors["border"], highlightthickness=1)
            tile.grid(row=index // 5, column=index % 5, sticky="nsew", padx=6, pady=6)
            tk.Label(tile, text=field_name, bg=self.colors["panel_alt"], fg=self.colors["muted"], font=("Segoe UI", 9)).pack(anchor="w", padx=10, pady=(10, 2))
            tk.Label(tile, textvariable=self.card_vars[field_name], bg=self.colors["panel_alt"], fg=self.colors["text"], font=("Consolas", 12, "bold")).pack(anchor="w", padx=10, pady=(0, 10))

        brief_row = tk.Frame(parent, bg=self.colors["bg"])
        brief_row.grid(row=1, column=0, sticky="ew", pady=(0, 14))
        brief_row.columnconfigure(0, weight=1)
        brief_row.columnconfigure(1, weight=1)

        self.brief_text = self._build_text_panel(brief_row, 0, "Executive Brief")
        self.preflight_text = self._build_text_panel(brief_row, 1, "Preflight Controls")

        notebooks = ttk.Notebook(parent, style="Deck.TNotebook")
        notebooks.grid(row=2, column=0, sticky="nsew")

        signal_tab = ttk.Frame(notebooks, style="Deck.TFrame", padding=6)
        report_tab = ttk.Frame(notebooks, style="Deck.TFrame", padding=6)
        log_tab = ttk.Frame(notebooks, style="Deck.TFrame", padding=6)
        notebooks.add(signal_tab, text="Signal Stack")
        notebooks.add(report_tab, text="Executive Report")
        notebooks.add(log_tab, text="Activity Log")

        self.signal_text = self._build_single_tab_text(signal_tab, "Signal Stack")
        self.report_text = self._build_single_tab_text(report_tab, "Executive Report")
        self.log_text = self._build_single_tab_text(log_tab, "Activity Log", foreground=self.colors["accent"])

        self._set_text(self.brief_text, "Connect to the bot to generate a directive.")
        self._set_text(self.preflight_text, "Preflight checks will appear here after connection.")
        self._set_text(self.signal_text, "Signal stack will populate after market analysis.")
        self._set_text(self.report_text, "Executive report will populate here after connection.")
        self._set_text(self.log_text, "TradeTron round two command center ready.")

    def _build_text_panel(self, parent, column, title):
        card = ttk.LabelFrame(parent, text=title, style="Card.TLabelframe", padding=14)
        card.grid(row=0, column=column, sticky="nsew", padx=(0 if column == 0 else 8, 0))
        card.columnconfigure(0, weight=1)
        card.rowconfigure(0, weight=1)
        widget = scrolledtext.ScrolledText(card, height=11, wrap="word", bg="#0b1814", fg=self.colors["text"], insertbackground=self.colors["text"], font=("Consolas", 10), relief="flat", padx=10, pady=10)
        widget.grid(row=0, column=0, sticky="nsew")
        widget.configure(state="disabled")
        return widget

    def _build_single_tab_text(self, parent, title, foreground=None):
        card = ttk.LabelFrame(parent, text=title, style="Card.TLabelframe", padding=14)
        card.pack(fill="both", expand=True)
        widget = scrolledtext.ScrolledText(card, height=16, wrap="word", bg="#0a1512", fg=foreground or self.colors["text"], insertbackground=foreground or self.colors["text"], font=("Consolas", 10), relief="flat", padx=10, pady=10)
        widget.pack(fill="both", expand=True)
        widget.configure(state="disabled")
        return widget

    def _add_entry(self, parent, row_index, label, variable, show=None):
        ttk.Label(parent, text=label, style="Body.TLabel").grid(row=row_index, column=0, sticky="w", pady=6)
        entry = ttk.Entry(parent, textvariable=variable, style="Deck.TEntry", show=show)
        entry.grid(row=row_index, column=1, sticky="ew", pady=6)
        return entry

    def _set_text(self, widget, value):
        widget.configure(state="normal")
        widget.delete("1.0", "end")
        widget.insert("1.0", value)
        widget.configure(state="disabled")

    def _append_log(self, message: str):
        self.log_text.configure(state="normal")
        self.log_text.insert("end", f"{message}\n")
        self.log_text.see("end")
        self.log_text.configure(state="disabled")

    def _refresh_status_banner(self):
        is_connecting = bool(self.connect_thread and self.connect_thread.is_alive())
        is_running = bool(self.bot_thread and self.bot_thread.is_alive())
        signal_action = self.card_vars["Directive"].get()
        estimated_buy_at = self.card_vars["Would Buy At"].get()
        hold_summary = self.card_vars["Why Hold"].get()

        if is_connecting:
            self.status_headline_var.set("Connecting to exchange and loading market data")
            self.status_detail_var.set("TradeTron is validating the session, loading the latest candles, and building the first analysis snapshot.")
            return

        if not self.bot:
            self.status_headline_var.set("Step 1: Connect market data")
            self.status_detail_var.set("Open Session, enable Paper Trading, choose coinbase or kraken, then click Connect Market Data. Connect only loads data and analysis.")
            return

        if is_running:
            if signal_action == "BUY":
                self.status_headline_var.set("Auto trading is running with a live buy setup")
                self.status_detail_var.set("The loop is active and scanning continuously. If guardrails still pass, TradeTron can open a paper trade when the next qualifying cycle confirms.")
            elif signal_action == "SELL":
                self.status_headline_var.set("Auto trading is running with an active exit setup")
                self.status_detail_var.set("The loop is active and monitoring for exit execution against any open positions.")
            else:
                self.status_headline_var.set("Auto trading is running and waiting for a signal")
                self.status_detail_var.set(
                    f"The bot is connected and scanning every Check Interval seconds. "
                    f"If a setup appears, the estimated paper entry is {estimated_buy_at}. "
                    f"Current blockers: {hold_summary}."
                )
            return

        self.status_headline_var.set("Step 2: Start auto trading")
        self.status_detail_var.set(
            f"You are connected and analysis is working. Click Start Auto Trading to begin the continuous loop. "
            f"Right now the model directive is {signal_action}. Estimated paper entry is {estimated_buy_at}. "
            f"Current blockers: {hold_summary}."
        )

    def _browse_config(self):
        selected = filedialog.asksaveasfilename(
            title="Choose TradeTron config file",
            defaultextension=".json",
            filetypes=[("JSON files", "*.json"), ("All files", "*.*")],
        )
        if not selected:
            return
        self.config_path_var.set(selected)
        self._load_form_config(selected)
        self._append_log(f"Loaded form values from {selected}")

    def _load_form_config(self, config_path: str):
        try:
            config = load_bot_config_file(config_path)
        except Exception as exc:
            messagebox.showerror("Config Error", f"Could not load config:\n{exc}")
            return

        self._append_log(f"Using config file: {resolve_config_path(config_path)}")

        for field_name, _, _ in [*self.MODEL_FIELDS, *self.RISK_FIELDS]:
            self.form_vars[field_name].set(str(config.get(field_name, "")))
        for field_name, _ in self.BOOL_FIELDS:
            self.form_vars[field_name].set(bool(config.get(field_name, False)))

    def _collect_form_config(self):
        config = load_bot_config_file(self.config_path_var.get().strip() or "bot_config.json")

        for field_name, label, field_type in [*self.MODEL_FIELDS, *self.RISK_FIELDS]:
            raw_value = self.form_vars[field_name].get().strip()
            if field_type == "string":
                if not raw_value:
                    raise ValueError(f"{label} is required.")
                config[field_name] = raw_value
            elif field_type == "choice":
                if raw_value not in {"fixed", "risk_adjusted"}:
                    raise ValueError("Sizing Method must be either 'fixed' or 'risk_adjusted'.")
                config[field_name] = raw_value
            elif field_type == "int":
                config[field_name] = int(raw_value)
            else:
                config[field_name] = float(raw_value)

        for field_name, _ in self.BOOL_FIELDS:
            config[field_name] = bool(self.form_vars[field_name].get())

        if config["sma_short"] >= config["sma_long"]:
            raise ValueError("SMA Short must be smaller than SMA Long.")
        if config["position_size"] <= 0 and config["position_sizing_method"] == "fixed":
            raise ValueError("Fallback Size must be greater than zero in fixed mode.")
        if config["risk_per_trade"] <= 0 or config["risk_per_trade"] > 0.03:
            raise ValueError("Risk / Trade should stay between 0 and 3%.")
        if config["max_symbol_exposure"] > config["max_portfolio_exposure"]:
            raise ValueError("Max Symbol Exposure cannot exceed Max Portfolio Exposure.")
        if config["check_interval"] <= 0:
            raise ValueError("Check Interval must be greater than zero.")

        return config

    def _validate_session(self, config):
        exchange_name = self.exchange_var.get().strip().lower()
        if not exchange_name:
            raise ValueError("Exchange is required.")

        api_key = self.api_key_var.get().strip()
        api_secret = self.api_secret_var.get().strip()

        if not config.get("enable_paper_trading", False) and (not api_key or not api_secret):
            raise ValueError("API key and API secret are required for live trading.")

        return exchange_name, api_key, api_secret

    def save_config(self):
        try:
            config = self._collect_form_config()
            config_path = self.config_path_var.get().strip() or "bot_config.json"
            resolved_path = save_bot_config_file(config_path, config)
            if self.bot:
                self.bot.apply_config(config, config_path)
            self._append_log(f"Saved config to {resolved_path}")
        except Exception as exc:
            messagebox.showerror("Save Failed", str(exc))

    def connect_bot(self):
        if self.connect_thread and self.connect_thread.is_alive():
            return

        try:
            config = self._collect_form_config()
            exchange_name, api_key, api_secret = self._validate_session(config)
            config_path = self.config_path_var.get().strip() or "bot_config.json"
            resolved_path = save_bot_config_file(config_path, config)
        except Exception as exc:
            messagebox.showerror("Connection Error", str(exc))
            return

        self.connection_var.set("Connecting...")
        self.mode_var.set("Preparing paper session" if config.get("enable_paper_trading", False) else "Preparing live session")
        self._append_log(f"Preparing config at {resolved_path}")
        if config.get("enable_paper_trading", False):
            self._append_log("Paper trading enabled: public market data only, API keys optional.")
        self._refresh_status_banner()
        self._update_buttons()
        self.connect_thread = threading.Thread(
            target=self._connect_worker,
            args=(exchange_name, api_key, api_secret, config_path),
            daemon=True,
        )
        self.connect_thread.start()

    def _connect_worker(self, exchange_name: str, api_key: str, api_secret: str, config_path: str):
        try:
            bot = CryptoTradingBot(exchange_name, api_key, api_secret, config_file=config_path)
            if self.log_handler not in bot.logger.handlers:
                bot.logger.addHandler(self.log_handler)
            payload = bot.get_command_deck_payload(refresh_market_data=True)
            self.event_queue.put(("connected", bot))
            self.event_queue.put(("payload", payload))
            self.event_queue.put(("log", f"Connected command center session to {exchange_name}."))
        except Exception as exc:
            self.event_queue.put(("connect_failed", str(exc)))

    def start_bot(self):
        if not self.bot:
            messagebox.showinfo("Connect First", "Connect to the bot before starting execution.")
            return
        if self.bot_thread and self.bot_thread.is_alive():
            return

        try:
            config = self._collect_form_config()
            config_path = self.config_path_var.get().strip() or "bot_config.json"
            resolved_path = save_bot_config_file(config_path, config)
            self.bot.apply_config(config, config_path)
            self._validate_session(config)
        except Exception as exc:
            messagebox.showerror("Start Failed", str(exc))
            return

        self.mode_var.set("Paper auto trading live" if config.get("enable_paper_trading", False) else "Auto trading live")
        self._append_log(f"Starting execution loop with config {resolved_path}")
        self._refresh_status_banner()
        self._update_buttons()
        self.bot_thread = threading.Thread(target=self._run_bot_worker, daemon=True)
        self.bot_thread.start()

    def _run_bot_worker(self):
        try:
            self.bot.run_trading_cycle()
        finally:
            self.event_queue.put(("bot_stopped", None))

    def stop_bot(self):
        if self.bot:
            self.bot.request_stop()
            self.mode_var.set("Stopping...")
            self._append_log("Stop requested.")
            self._refresh_status_banner()
            self._update_buttons()

    def refresh_snapshot(self):
        if not self.bot:
            self._append_log("No connected bot to brief.")
            return
        if self.snapshot_thread and self.snapshot_thread.is_alive():
            return

        self.snapshot_thread = threading.Thread(target=self._snapshot_worker, daemon=True)
        self.snapshot_thread.start()
        self.last_snapshot_at = time.monotonic()

    def _snapshot_worker(self):
        try:
            payload = self.bot.get_command_deck_payload(refresh_market_data=True)
            self.event_queue.put(("payload", payload))
        except Exception as exc:
            self.event_queue.put(("log", f"Briefing refresh failed: {exc}"))

    def export_report(self):
        if not self.bot:
            messagebox.showinfo("No Report", "Connect to the bot before exporting a report.")
            return

        destination = filedialog.asksaveasfilename(
            title="Export executive report",
            defaultextension=".txt",
            filetypes=[("Text files", "*.txt"), ("All files", "*.*")],
        )
        if not destination:
            return

        try:
            report = self.bot.generate_report()
            with open(destination, "w", encoding="utf-8") as file_handle:
                file_handle.write(report)
            self._append_log(f"Exported report to {destination}")
        except Exception as exc:
            messagebox.showerror("Export Failed", str(exc))

    def _apply_payload(self, payload):
        metrics = payload["metrics"]
        stats = payload["stats"]
        signal = payload["signal"]
        preflight = payload["preflight"]
        blocker_tags = signal.get("buy_blocker_tags", [])
        blocker_summary = ", ".join(blocker_tags[:3]).upper() if blocker_tags else "NONE"
        if len(blocker_tags) > 3:
            blocker_summary = f"{blocker_summary} +{len(blocker_tags) - 3}"

        self.readiness_var.set(f"{preflight['readiness_status'].upper()} | {preflight['readiness_score']:.0f}")
        self.directive_var.set(f"Directive: {signal['action']} | {signal['regime']}")

        card_values = {
            "Readiness": f"{preflight['readiness_score']:.0f}",
            "Directive": signal["action"],
            "Regime": signal["regime"],
            "Risk Posture": metrics["risk_posture"],
            "Current Price": f"${signal['current_price']:,.2f}" if signal["current_price"] else "Unavailable",
            "Would Buy At": f"${signal['estimated_entry_price']:,.2f}" if signal.get("estimated_entry_price") else "Unavailable",
            "Portfolio Value": f"${metrics['portfolio_value']:,.2f}",
            "Paper Cash": (
                f"{metrics['paper_cash']:,.2f} {metrics['quote_currency']}"
                if self.bot and self.bot.config.get("enable_paper_trading", False)
                else "Live account"
            ),
            "Paper Inventory": (
                f"{metrics['paper_asset_balance']:.6f} {metrics['base_currency']}"
                if self.bot and self.bot.config.get("enable_paper_trading", False)
                else "Exchange-held"
            ),
            "Exposure": f"{metrics['exposure_ratio'] * 100:.1f}%",
            "Open Positions": str(metrics["open_positions"]),
            "Buy Score": f"{signal['buy_score']:.1f}",
            "Sell Score": f"{signal['sell_score']:.1f}",
            "Confidence": f"{signal['confidence']:.1f}",
            "Rec. Size": f"{signal['recommended_size']:.6f}",
            "Total Trades": str(stats["total_trades"]),
            "Win Rate": f"{stats['win_rate'] * 100:.2f}%",
            "Daily Loss": f"{metrics['daily_loss'] * 100:.2f}%",
            "Max Drawdown": f"{stats['max_drawdown'] * 100:.2f}%",
            "Paper Fees": (
                f"{metrics['paper_fees_paid']:,.2f} {metrics['quote_currency']}"
                if self.bot and self.bot.config.get("enable_paper_trading", False)
                else "--"
            ),
            "Paper P&L": (
                f"{metrics['paper_realized_pnl'] + metrics['paper_unrealized_pnl']:,.2f} {metrics['quote_currency']}"
                if self.bot and self.bot.config.get("enable_paper_trading", False)
                else "--"
            ),
            "Why Hold": "READY NOW" if signal.get("action") == "BUY" else blocker_summary or "WAITING",
        }
        for key, value in card_values.items():
            self.card_vars[key].set(value)

        self.connection_var.set(
            f"Paper connected to {self.bot.exchange.name}" if self.bot and self.bot.config.get("enable_paper_trading", False)
            else f"Connected to {self.bot.exchange.name}" if self.bot
            else "Disconnected"
        )
        self.mode_var.set("Paper session" if self.bot and self.bot.config.get("enable_paper_trading", False) else "Live session" if self.bot else "Idle")
        self._refresh_status_banner()

        self._set_text(self.brief_text, payload["executive_brief"])
        self._set_text(self.preflight_text, payload["preflight_text"])
        self._set_text(self.signal_text, payload["signal_stack"])
        self._set_text(self.report_text, payload["report"])

    def _update_buttons(self):
        is_connecting = self.connect_thread and self.connect_thread.is_alive()
        is_running = self.bot_thread and self.bot_thread.is_alive()
        has_bot = self.bot is not None

        self.connect_button.state(["disabled"] if is_connecting or is_running else ["!disabled"])
        self.save_button.state(["disabled"] if is_running else ["!disabled"])
        self.start_button.state(["!disabled"] if has_bot and not is_running else ["disabled"])
        self.stop_button.state(["!disabled"] if has_bot and is_running else ["disabled"])
        self.refresh_button.state(["!disabled"] if has_bot else ["disabled"])
        self.export_button.state(["!disabled"] if has_bot else ["disabled"])
        self._refresh_status_banner()

    def _process_events(self):
        while True:
            try:
                event_name, payload = self.event_queue.get_nowait()
            except queue.Empty:
                break

            if event_name == "log":
                self._append_log(payload)
            elif event_name == "connected":
                self.bot = payload
                self._update_buttons()
            elif event_name == "payload":
                self._apply_payload(payload)
            elif event_name == "connect_failed":
                self.connection_var.set("Connection failed")
                self.mode_var.set("Idle")
                self._update_buttons()
                self._refresh_status_banner()
                messagebox.showerror("Connection Failed", payload)
            elif event_name == "bot_stopped":
                self.mode_var.set("Idle")
                self._update_buttons()
                self._refresh_status_banner()
                if self.bot:
                    self.event_queue.put(("payload", self.bot.get_command_deck_payload(refresh_market_data=False)))

    def _tick(self):
        self._process_events()
        if self.bot and not (self.snapshot_thread and self.snapshot_thread.is_alive()):
            if time.monotonic() - self.last_snapshot_at > 8:
                self.refresh_snapshot()
        self.root.after(250, self._tick)

    def on_close(self):
        if self.bot and self.bot_thread and self.bot_thread.is_alive():
            if not messagebox.askyesno("Stop Bot", "The bot is still running. Stop it and close the command center?"):
                return
            self.bot.request_stop()
        self.root.destroy()

    def run(self):
        self.root.mainloop()


if __name__ == "__main__":
    TradeTronDashboard().run()
