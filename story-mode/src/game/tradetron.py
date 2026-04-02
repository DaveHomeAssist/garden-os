from __future__ import annotations

try:
    import ccxt
except ModuleNotFoundError:
    ccxt = None
import time
try:
    import pandas as pd
except ModuleNotFoundError:
    pd = None
try:
    import numpy as np
except ModuleNotFoundError:
    np = None
import logging
import copy
from datetime import datetime, timedelta
import json
import os
from typing import Dict, List, Optional, Tuple
import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
import sqlite3
from pathlib import Path
import asyncio
try:
    import aiohttp
except ModuleNotFoundError:
    aiohttp = None
import hashlib
import warnings
from functools import wraps

# Suppress warnings for cleaner output
warnings.filterwarnings('ignore')

DEFAULT_BOT_CONFIG = {
    'symbol': 'BTC/USDT',
    'strategy_profile': 'Balanced',
    'position_size': 0.001,
    'stop_loss': 0.05,
    'take_profit': 0.10,
    'position_sizing_method': 'risk_adjusted',
    'timeframe': '1h',
    'sma_short': 20,
    'sma_long': 50,
    'rsi_period': 14,
    'atr_period': 14,
    'atr_stop_multiple': 1.8,
    'trailing_stop_multiple': 2.6,
    'risk_per_trade': 0.005,
    'buy_score_threshold': 64.0,
    'sell_score_threshold': 60.0,
    'min_signal_confidence': 62.0,
    'max_daily_loss': 0.02,
    'max_concurrent_trades': 3,
    'market_history_limit': 360,
    'trade_cooldown_minutes': 20,
    'max_hold_hours': 24.0,
    'pause_after_loss_streak': 3,
    'loss_streak_cooldown_minutes': 180,
    'min_volume': 1000000,
    'max_portfolio_exposure': 0.25,
    'max_symbol_exposure': 0.10,
    'trading_enabled': True,
    'email_notifications': False,
    'email_config': {
        'smtp_server': 'smtp.gmail.com',
        'smtp_port': 587,
        'email': 'your_email@gmail.com',
        'password': 'your_password'
    },
    'check_interval': 60,
    'max_slippage': 0.01,
    'profit_target': 0.15,
    'risk_reward_ratio': 1.0,
    'max_drawdown': 0.10,
    'use_volatility_filter': True,
    'volatility_period': 20,
    'volatility_threshold': 0.05,
    'max_volatility_ceiling': 0.12,
    'max_position_size': 0.01,
    'min_position_size': 0.0001,
    'price_impact_threshold': 0.005,
    'max_retries': 3,
    'retry_delay': 10,
    'enable_paper_trading': False,
    'paper_balance': 1000.0,
    'paper_fee_rate': 0.001,
    'paper_slippage_bps': 5.0,
    'use_trend_filter': True,
    'trend_period': 50,
    'trend_threshold': 0.01,
    'volume_surge_threshold': 1.1
}


def merge_config_with_defaults(config_data: Optional[Dict] = None) -> Dict:
    """Merge persisted config values into the default bot configuration."""
    merged = copy.deepcopy(DEFAULT_BOT_CONFIG)

    if not config_data:
        return merged

    for key, value in config_data.items():
        if isinstance(value, dict) and isinstance(merged.get(key), dict):
            merged[key].update(value)
        else:
            merged[key] = value

    return merged


def resolve_config_path(config_file: Optional[str] = None) -> Path:
    """Resolve config files relative to this module instead of the process cwd."""
    raw_path = Path(config_file or "bot_config.json").expanduser()
    if raw_path.is_absolute():
        return raw_path
    return Path(__file__).resolve().parent / raw_path


def save_bot_config_file(config_file: str, config_data: Dict) -> Path:
    """Persist config data to disk, creating parent folders when needed."""
    path = resolve_config_path(config_file)
    path.parent.mkdir(parents=True, exist_ok=True)
    payload = merge_config_with_defaults(config_data)

    with path.open('w', encoding='utf-8') as file_handle:
        json.dump(payload, file_handle, indent=4)

    return path


def load_bot_config_file(config_file: str) -> Dict:
    """Load config data from disk or create a defaults-backed file."""
    path = resolve_config_path(config_file)

    if path.exists():
        with path.open('r', encoding='utf-8') as file_handle:
            return merge_config_with_defaults(json.load(file_handle))

    default_config = merge_config_with_defaults()
    save_bot_config_file(str(path), default_config)
    return default_config

class CryptoTradingBot:
    def __init__(self, exchange_name: str, api_key: str = "", api_secret: str = "", 
                 config_file: str = "bot_config.json"):
        """
        Initialize the crypto trading bot with exchange connection and configuration
        
        Args:
            exchange_name (str): Name of the exchange (e.g., 'binance', 'coinbase')
            api_key (str): API key for the exchange
            api_secret (str): API secret for the exchange
            config_file (str): Configuration file path
        """
        missing_modules = [name for name, module in (("ccxt", ccxt), ("pandas", pd), ("numpy", np)) if module is None]
        if missing_modules:
            package_list = " ".join(missing_modules)
            raise ImportError(f"Missing dependencies: {', '.join(missing_modules)}. Install them with: pip install {package_list}")

        self.api_key = (api_key or "").strip()
        self.api_secret = (api_secret or "").strip()
        self.runtime_dir = resolve_config_path(config_file).parent
        self.runtime_dir.mkdir(parents=True, exist_ok=True)
        self.state_path = self.runtime_dir / 'tradetron_state.json'
        
        # Initialize exchange connection
        exchange_factory = getattr(ccxt, exchange_name, None)
        if exchange_factory is None:
            raise ValueError(f"Unsupported exchange: {exchange_name}")

        self.exchange_name = exchange_name
        exchange_options = {
            'enableRateLimit': True,
            'options': {
                'defaultType': 'spot',  # or 'future' for futures
            }
        }
        if self.api_key:
            exchange_options['apiKey'] = self.api_key
        if self.api_secret:
            exchange_options['secret'] = self.api_secret
        self.exchange = exchange_factory(exchange_options)
        
        # Load or create configuration
        self.config_file = config_file
        self.config = self.load_config(config_file)
        self.sync_runtime_settings()
        
        # Trading state
        self.open_positions = {}
        self.trade_history = []
        self.last_trade_time = None
        self.daily_loss = 0.0
        self.total_trades = 0
        self.win_trades = 0
        self.loss_trades = 0
        self.start_time = datetime.now()
        self.stop_requested = False
        self.latest_market_frame = pd.DataFrame()
        self.latest_signal_snapshot = {}
        self.last_preflight = {}
        self.paper_state = {}
        self.last_daily_reset_date = datetime.now().date().isoformat()
        self.cooldown_until = None
        self.pause_until = None
        self.next_cycle_due_at = None
        self.last_cycle_completed_at = None
        
        # Initialize logging
        self.setup_logging()

        # Initialize the simulated account before connectivity checks.
        self.initialize_paper_trading_state()
        
        # Check exchange connectivity
        self.check_exchange_connection()
        
        # Initialize database for trade history
        self.init_database()
        
        # Initialize metrics tracking
        self.metrics = {
            'total_profit_loss': 0.0,
            'equity_peak': 0.0,
            'max_drawdown': 0.0,
            'win_streak': 0,
            'loss_streak': 0,
            'last_trade_time': None
        }
        self.load_runtime_state()
        
        self.logger.info("Crypto Trading Bot initialized successfully")
    
    def load_config(self, config_file: str) -> Dict:
        """Load configuration from file or create default"""
        return load_bot_config_file(config_file)

    def sync_runtime_settings(self):
        """Refresh runtime fields from the current config object."""
        self.symbol = self.config.get('symbol', 'BTC/USDT')
        self.position_size = self.config.get('position_size', 0.001)
        self.strategy_profile = self.config.get('strategy_profile', 'Balanced')
        self.stop_loss = self.config.get('stop_loss', 0.05)
        self.take_profit = self.config.get('take_profit', 0.10)
        self.position_sizing_method = self.config.get('position_sizing_method', 'risk_adjusted')
        self.timeframe = self.config.get('timeframe', '1h')
        self.max_positions = self.config.get('max_positions', 5)

        self.sma_short = self.config.get('sma_short', 20)
        self.sma_long = self.config.get('sma_long', 50)
        self.rsi_period = self.config.get('rsi_period', 14)
        self.atr_period = self.config.get('atr_period', 14)
        self.atr_stop_multiple = self.config.get('atr_stop_multiple', 1.8)
        self.trailing_stop_multiple = self.config.get('trailing_stop_multiple', 2.6)
        self.risk_per_trade = self.config.get('risk_per_trade', 0.005)
        self.buy_score_threshold = self.config.get('buy_score_threshold', 64.0)
        self.sell_score_threshold = self.config.get('sell_score_threshold', 60.0)
        self.min_signal_confidence = self.config.get('min_signal_confidence', 62.0)

        self.max_daily_loss = self.config.get('max_daily_loss', 0.02)
        self.max_concurrent_trades = self.config.get('max_concurrent_trades', 3)
        self.market_history_limit = max(int(self.config.get('market_history_limit', 360) or 360), self.sma_long * 4, 120)
        self.trade_cooldown_minutes = max(float(self.config.get('trade_cooldown_minutes', 20) or 0.0), 0.0)
        self.max_hold_hours = max(float(self.config.get('max_hold_hours', 24.0) or 0.0), 0.0)
        self.pause_after_loss_streak = max(int(self.config.get('pause_after_loss_streak', 3) or 0), 0)
        self.loss_streak_cooldown_minutes = max(float(self.config.get('loss_streak_cooldown_minutes', 180) or 0.0), 0.0)
        self.min_volume = self.config.get('min_volume', 1000000)
        self.max_portfolio_exposure = self.config.get('max_portfolio_exposure', 0.25)
        self.max_symbol_exposure = self.config.get('max_symbol_exposure', 0.10)
        self.max_position_size = self.config.get('max_position_size', 0.01)
        self.min_position_size = self.config.get('min_position_size', 0.0001)
        self.max_volatility_ceiling = self.config.get('max_volatility_ceiling', 0.12)
        self.volume_surge_threshold = self.config.get('volume_surge_threshold', 1.1)
        self.paper_fee_rate = max(float(self.config.get('paper_fee_rate', 0.001) or 0.0), 0.0)
        self.paper_slippage_bps = max(float(self.config.get('paper_slippage_bps', 5.0) or 0.0), 0.0)
        self.base_currency, self.quote_currency = self._parse_symbol_components(self.symbol)

    def apply_config(self, config_data: Dict, config_file: Optional[str] = None):
        """Apply config changes from a UI or another controller."""
        self.config = merge_config_with_defaults(config_data)
        if config_file:
            self.config_file = config_file
        self.sync_runtime_settings()
        if hasattr(self, 'paper_state'):
            self.initialize_paper_trading_state()
        self.save_runtime_state()

    def _serialize_datetime(self, value: Optional[datetime]) -> Optional[str]:
        """Serialize datetimes for the runtime state file."""
        if isinstance(value, datetime):
            return value.isoformat()
        return value

    def _deserialize_datetime(self, value) -> Optional[datetime]:
        """Best-effort datetime parser for persisted runtime state."""
        if isinstance(value, datetime):
            return value
        if isinstance(value, str) and value:
            try:
                return datetime.fromisoformat(value)
            except ValueError:
                return None
        return None

    def _serialize_position(self, position: Dict) -> Dict:
        """Convert a live position record into a JSON-safe structure."""
        payload = copy.deepcopy(position)
        payload['timestamp'] = self._serialize_datetime(payload.get('timestamp'))
        return payload

    def _deserialize_position(self, position: Dict) -> Dict:
        """Convert persisted position data back into runtime form."""
        payload = copy.deepcopy(position)
        payload['timestamp'] = self._deserialize_datetime(payload.get('timestamp')) or datetime.now()
        return payload

    def save_runtime_state(self):
        """Persist runtime status so paper sessions can resume cleanly."""
        state_payload = {
            'symbol': self.symbol,
            'strategy_profile': self.strategy_profile,
            'daily_loss': self.daily_loss,
            'total_trades': self.total_trades,
            'win_trades': self.win_trades,
            'loss_trades': self.loss_trades,
            'trade_history': self.trade_history[-300:],
            'open_positions': {order_id: self._serialize_position(position) for order_id, position in self.open_positions.items()},
            'metrics': {
                **self.metrics,
                'last_trade_time': self._serialize_datetime(self.metrics.get('last_trade_time')),
            },
            'paper_state': self.paper_state,
            'last_daily_reset_date': self.last_daily_reset_date,
            'cooldown_until': self._serialize_datetime(self.cooldown_until),
            'pause_until': self._serialize_datetime(self.pause_until),
            'next_cycle_due_at': self._serialize_datetime(self.next_cycle_due_at),
            'last_cycle_completed_at': self._serialize_datetime(self.last_cycle_completed_at),
        }

        try:
            with self.state_path.open('w', encoding='utf-8') as file_handle:
                json.dump(state_payload, file_handle, indent=2)
        except Exception as exc:
            logger = getattr(self, 'logger', None)
            if logger:
                logger.error(f"Failed to save runtime state: {exc}")

    def load_runtime_state(self):
        """Restore persisted runtime state when it matches the current symbol."""
        if not self.state_path.exists():
            return

        try:
            with self.state_path.open('r', encoding='utf-8') as file_handle:
                state_payload = json.load(file_handle)
        except Exception as exc:
            self.logger.error(f"Failed to load runtime state: {exc}")
            return

        if state_payload.get('symbol') and state_payload.get('symbol') != self.symbol:
            self.logger.info(
                f"Runtime state file is for {state_payload.get('symbol')} and will not be applied to {self.symbol}."
            )
            return

        self.daily_loss = float(state_payload.get('daily_loss', self.daily_loss) or 0.0)
        self.total_trades = int(state_payload.get('total_trades', self.total_trades) or 0)
        self.win_trades = int(state_payload.get('win_trades', self.win_trades) or 0)
        self.loss_trades = int(state_payload.get('loss_trades', self.loss_trades) or 0)
        self.trade_history = list(state_payload.get('trade_history', self.trade_history))
        self.open_positions = {
            order_id: self._deserialize_position(position)
            for order_id, position in state_payload.get('open_positions', {}).items()
        }
        persisted_metrics = state_payload.get('metrics', {})
        if persisted_metrics:
            self.metrics.update(persisted_metrics)
            self.metrics['last_trade_time'] = self._deserialize_datetime(self.metrics.get('last_trade_time'))
        self.paper_state = state_payload.get('paper_state', self.paper_state)
        self.last_daily_reset_date = state_payload.get('last_daily_reset_date', self.last_daily_reset_date)
        self.cooldown_until = self._deserialize_datetime(state_payload.get('cooldown_until'))
        self.pause_until = self._deserialize_datetime(state_payload.get('pause_until'))
        self.next_cycle_due_at = self._deserialize_datetime(state_payload.get('next_cycle_due_at'))
        self.last_cycle_completed_at = self._deserialize_datetime(state_payload.get('last_cycle_completed_at'))
        self.initialize_paper_trading_state()
        self.logger.info("Runtime state restored from disk")

    def _minutes_until(self, target: Optional[datetime]) -> float:
        """Return remaining minutes until a future timestamp."""
        if not target:
            return 0.0
        return max(0.0, (target - datetime.now()).total_seconds() / 60.0)

    def format_minutes_remaining(self, minutes_remaining: float) -> str:
        """Format remaining minutes as a short human-readable label."""
        if minutes_remaining <= 0:
            return "Ready"
        if minutes_remaining < 1:
            return "<1 min"
        if minutes_remaining < 60:
            return f"{minutes_remaining:.0f} min"
        return f"{minutes_remaining / 60.0:.1f} hr"

    def reset_daily_guardrails_if_needed(self):
        """Reset daily loss controls when the calendar day changes."""
        today = datetime.now().date().isoformat()
        if self.last_daily_reset_date == today:
            return

        self.daily_loss = 0.0
        self.last_daily_reset_date = today
        self.logger.info("Daily risk controls reset for a new trading day")
        self.save_runtime_state()

    def get_entry_restrictions(self) -> List[str]:
        """Report any non-market reasons why new entries are paused."""
        restrictions = []
        cooldown_remaining = self._minutes_until(self.cooldown_until)
        pause_remaining = self._minutes_until(self.pause_until)

        if cooldown_remaining > 0:
            restrictions.append(f"Trade cooldown active for {self.format_minutes_remaining(cooldown_remaining)}")
        if pause_remaining > 0:
            restrictions.append(f"Loss-streak pause active for {self.format_minutes_remaining(pause_remaining)}")

        return restrictions

    def set_trade_cooldown(self, minutes: float, reason: str):
        """Hold new entries for a cooling-off period."""
        if minutes <= 0:
            return
        self.cooldown_until = datetime.now() + timedelta(minutes=float(minutes))
        self.logger.info(f"Trade cooldown started for {minutes:.0f} minutes: {reason}")
        self.save_runtime_state()

    def set_loss_streak_pause(self, minutes: float, reason: str):
        """Pause new entries after repeated losses."""
        if minutes <= 0:
            return
        self.pause_until = datetime.now() + timedelta(minutes=float(minutes))
        self.logger.warning(f"Loss-streak pause started for {minutes:.0f} minutes: {reason}")
        self.save_runtime_state()

    def _parse_symbol_components(self, symbol: str) -> Tuple[str, str]:
        """Split the configured symbol into base and quote currency codes."""
        normalized = (symbol or "BTC/USDT").split(":")[0]
        if "/" in normalized:
            base_currency, quote_currency = normalized.split("/", 1)
        elif "-" in normalized:
            base_currency, quote_currency = normalized.split("-", 1)
        else:
            base_currency, quote_currency = normalized[:-4] or normalized, normalized[-4:] or "USDT"
        return base_currency.upper(), quote_currency.upper()

    def initialize_paper_trading_state(self):
        """Set up or refresh the in-memory paper trading ledger."""
        if not self.config.get('enable_paper_trading', False):
            self.paper_state = {}
            return

        current_symbol = getattr(self, 'symbol', self.config.get('symbol', 'BTC/USDT'))
        current_state = self.paper_state or {}
        if current_state.get('symbol') == current_symbol:
            return

        starting_cash = max(float(self.config.get('paper_balance', 1000.0) or 0.0), 0.0)
        self.paper_state = {
            'symbol': current_symbol,
            'base_currency': self.base_currency,
            'quote_currency': self.quote_currency,
            'cash_balance': starting_cash,
            'asset_balance': 0.0,
            'fees_paid_quote': 0.0,
            'realized_pnl_quote': 0.0,
            'last_fill_price': 0.0,
            'last_equity': starting_cash,
            'equity_peak': starting_cash,
        }

        logger = getattr(self, 'logger', None)
        if logger:
            logger.info(
                f"Paper ledger initialized for {current_symbol}: "
                f"{starting_cash:.2f} {self.quote_currency} starting capital"
            )

    def get_price_reference(self, refresh_market: bool = False) -> float:
        """Resolve the best available reference price for portfolio valuation."""
        if refresh_market:
            return self.get_current_price()

        if self.latest_signal_snapshot and self.latest_signal_snapshot.get('current_price', 0.0):
            return float(self.latest_signal_snapshot.get('current_price') or 0.0)

        if not getattr(self, 'latest_market_frame', pd.DataFrame()).empty:
            try:
                return float(self.latest_market_frame.iloc[-1]['close'])
            except Exception:
                pass

        return self.get_current_price()

    def get_paper_account_snapshot(self, current_price: Optional[float] = None) -> Dict:
        """Return a mark-to-market snapshot of the simulated account."""
        self.initialize_paper_trading_state()
        if not self.paper_state:
            return {}

        reference_price = float(current_price or 0.0) or self.get_price_reference(refresh_market=False)
        asset_balance = float(self.paper_state.get('asset_balance', 0.0))
        cash_balance = float(self.paper_state.get('cash_balance', 0.0))
        asset_value_quote = asset_balance * reference_price if reference_price > 0 else 0.0
        total_equity = cash_balance + asset_value_quote
        unrealized_pnl_quote = 0.0

        for position in self.open_positions.values():
            if position.get('symbol') != self.symbol:
                continue
            entry_cost_basis = float(position.get('entry_cost_basis', position.get('amount', 0.0) * position.get('entry_price', 0.0)))
            position_value = float(position.get('amount', 0.0)) * reference_price
            unrealized_pnl_quote += position_value - entry_cost_basis

        self.paper_state['last_equity'] = total_equity
        self.paper_state['equity_peak'] = max(float(self.paper_state.get('equity_peak', total_equity)), total_equity)

        return {
            'cash_balance': cash_balance,
            'asset_balance': asset_balance,
            'asset_value_quote': asset_value_quote,
            'total_equity_quote': total_equity,
            'fees_paid_quote': float(self.paper_state.get('fees_paid_quote', 0.0)),
            'realized_pnl_quote': float(self.paper_state.get('realized_pnl_quote', 0.0)),
            'unrealized_pnl_quote': unrealized_pnl_quote,
            'last_fill_price': float(self.paper_state.get('last_fill_price', 0.0)),
            'base_currency': self.base_currency,
            'quote_currency': self.quote_currency,
        }

    def reset_paper_account(self):
        """Reset the simulated account, open positions, and in-memory performance counters."""
        if not self.config.get('enable_paper_trading', False):
            raise ValueError("Paper account reset is only available in paper trading mode.")

        self.open_positions = {}
        self.trade_history = []
        self.daily_loss = 0.0
        self.total_trades = 0
        self.win_trades = 0
        self.loss_trades = 0
        self.cooldown_until = None
        self.pause_until = None
        self.next_cycle_due_at = None
        self.metrics.update(
            {
                'total_profit_loss': 0.0,
                'equity_peak': 0.0,
                'max_drawdown': 0.0,
                'win_streak': 0,
                'loss_streak': 0,
                'last_trade_time': None,
            }
        )
        self.paper_state = {}
        self.initialize_paper_trading_state()
        self.save_runtime_state()
        self.logger.info("Paper account reset to starting conditions")

    def _execute_paper_order(self, side: str, amount: float, price: Optional[float] = None) -> Dict:
        """Simulate an order fill against the paper ledger using public pricing."""
        self.initialize_paper_trading_state()
        if amount <= 0:
            raise ValueError("Paper order amount must be greater than zero.")

        reference_price = float(price or 0.0) or self.get_price_reference(refresh_market=True)
        if reference_price <= 0:
            raise ValueError(f"Unable to fetch a public market price for {self.symbol}.")

        slippage_factor = self.paper_slippage_bps / 10000.0
        execution_price = reference_price * (1 + slippage_factor if side == 'buy' else 1 - slippage_factor)
        notional = execution_price * amount
        fee_cost = notional * self.paper_fee_rate

        if side == 'buy':
            available_cash = float(self.paper_state.get('cash_balance', 0.0))
            total_cost = notional + fee_cost
            if total_cost > available_cash:
                affordable_amount = available_cash / max(execution_price * (1 + self.paper_fee_rate), 1e-9)
                affordable_amount = round(max(0.0, affordable_amount), 8)
                if affordable_amount < self.min_position_size:
                    raise ValueError(
                        f"Insufficient paper cash for {side} order. "
                        f"Required {total_cost:.2f} {self.quote_currency}, available {available_cash:.2f}."
                    )
                amount = affordable_amount
                notional = execution_price * amount
                fee_cost = notional * self.paper_fee_rate
                total_cost = notional + fee_cost

            self.paper_state['cash_balance'] = available_cash - total_cost
            self.paper_state['asset_balance'] = float(self.paper_state.get('asset_balance', 0.0)) + amount
            quote_delta = -total_cost
        else:
            available_asset = float(self.paper_state.get('asset_balance', 0.0))
            if amount > available_asset:
                adjusted_amount = round(max(0.0, available_asset), 8)
                if adjusted_amount < self.min_position_size:
                    raise ValueError(
                        f"Insufficient paper {self.base_currency} balance for sell order. "
                        f"Available {available_asset:.8f}."
                    )
                amount = adjusted_amount
                notional = execution_price * amount
                fee_cost = notional * self.paper_fee_rate

            proceeds = notional - fee_cost
            self.paper_state['asset_balance'] = max(0.0, available_asset - amount)
            self.paper_state['cash_balance'] = float(self.paper_state.get('cash_balance', 0.0)) + proceeds
            quote_delta = proceeds

        self.paper_state['fees_paid_quote'] = float(self.paper_state.get('fees_paid_quote', 0.0)) + fee_cost
        self.paper_state['last_fill_price'] = execution_price

        return {
            'id': f"paper_{int(time.time() * 1000)}_{hashlib.sha1(f'{self.symbol}:{side}:{amount}:{execution_price}'.encode('utf-8')).hexdigest()[:8]}",
            'symbol': self.symbol,
            'side': side,
            'type': 'limit' if price else 'market',
            'status': 'closed',
            'filled': round(amount, 8),
            'amount': round(amount, 8),
            'price': round(execution_price, 8),
            'reference_price': round(reference_price, 8),
            'notional': round(notional, 8),
            'fee': {
                'cost': round(fee_cost, 8),
                'currency': self.quote_currency,
            },
            'quote_delta': round(quote_delta, 8),
            'cash_balance': round(float(self.paper_state.get('cash_balance', 0.0)), 8),
            'asset_balance': round(float(self.paper_state.get('asset_balance', 0.0)), 8),
            'paper_mode': True,
        }

    def _clamp(self, value: float, lower: float, upper: float) -> float:
        """Clamp a numeric value into the requested range."""
        return max(lower, min(upper, float(value)))

    def _safe_div(self, numerator: float, denominator: float, default: float = 0.0) -> float:
        """Protect ratio calculations from zero and NaN denominators."""
        if denominator in (0, None):
            return default
        try:
            if pd.isna(denominator):
                return default
        except Exception:
            pass
        return float(numerator) / float(denominator)

    def validate_config(self) -> List[str]:
        """Validate operational settings before the bot starts trading."""
        issues = []

        if self.sma_short >= self.sma_long:
            issues.append("SMA short window must be smaller than the long window.")
        if self.position_size <= 0 and self.position_sizing_method == 'fixed':
            issues.append("Fixed position size must be greater than zero.")
        if self.min_position_size <= 0 or self.max_position_size < self.min_position_size:
            issues.append("Minimum and maximum position sizes are out of bounds.")
        if self.risk_per_trade <= 0 or self.risk_per_trade > 0.03:
            issues.append("Risk per trade should stay between 0 and 3% for disciplined sizing.")
        if self.max_daily_loss <= 0 or self.max_daily_loss > 0.10:
            issues.append("Daily loss limit should remain between 0 and 10%.")
        if self.max_portfolio_exposure <= 0 or self.max_portfolio_exposure > 1:
            issues.append("Max portfolio exposure must stay between 0 and 100%.")
        if self.max_symbol_exposure <= 0 or self.max_symbol_exposure > self.max_portfolio_exposure:
            issues.append("Symbol exposure must be positive and no larger than portfolio exposure.")
        if self.atr_stop_multiple <= 0 or self.trailing_stop_multiple <= 0:
            issues.append("ATR stop and trailing stop multiples must be positive.")
        if self.buy_score_threshold < 50 or self.buy_score_threshold > 95:
            issues.append("Buy score threshold should remain between 50 and 95.")
        if self.sell_score_threshold < 50 or self.sell_score_threshold > 95:
            issues.append("Sell score threshold should remain between 50 and 95.")
        if self.min_signal_confidence < 50 or self.min_signal_confidence > 95:
            issues.append("Minimum signal confidence should remain between 50 and 95.")
        if self.market_history_limit < max(self.sma_long * 4, 120):
            issues.append("Market history limit should be large enough to support the configured indicators.")
        if self.trade_cooldown_minutes < 0:
            issues.append("Trade cooldown cannot be negative.")
        if self.max_hold_hours < 0:
            issues.append("Max hold hours cannot be negative.")
        if self.pause_after_loss_streak < 0:
            issues.append("Loss-streak pause threshold cannot be negative.")
        if self.loss_streak_cooldown_minutes < 0:
            issues.append("Loss-streak cooldown minutes cannot be negative.")

        return issues
    
    def setup_logging(self):
        """Setup logging for the bot"""
        log_path = self.runtime_dir / 'trading_bot.log'
        logging.basicConfig(
            level=logging.INFO,
            format='%(asctime)s - %(levelname)s - %(message)s',
            handlers=[
                logging.FileHandler(log_path),
                logging.StreamHandler()
            ]
        )
        self.logger = logging.getLogger(__name__)
        self.logger.info("Trading bot logging initialized")
    
    def check_exchange_connection(self):
        """Check if exchange connection is working"""
        try:
            if self.config.get('enable_paper_trading', False):
                ticker = self.exchange.fetch_ticker(self.symbol)
                self.logger.info(
                    f"Connected to {self.exchange.name} in paper trading mode "
                    f"using public market data only"
                )
                self.logger.info(
                    f"Latest {self.symbol} price: {ticker.get('last', 'Unavailable')} | "
                    f"API credentials optional in paper mode"
                )
                return

            self.exchange.fetch_balance()
            self.logger.info(f"Connected to {self.exchange.name}")
            self.logger.info("Account balance available")
        except Exception as e:
            self.logger.error(f"Failed to connect to exchange: {e}")
            raise Exception(f"Exchange connection failed: {e}")
    
    def get_market_data(self, limit: Optional[int] = None) -> pd.DataFrame:
        """
        Get historical market data
        
        Args:
            limit (int): Number of data points to fetch
            
        Returns:
            pd.DataFrame: Historical OHLCV data
        """
        try:
            limit = max(int(limit or self.market_history_limit), self.sma_long * 4, 120)
            ohlcv = self.exchange.fetch_ohlcv(self.symbol, self.timeframe, limit=limit)
            df = pd.DataFrame(ohlcv, columns=['timestamp', 'open', 'high', 'low', 'close', 'volume'])
            df['timestamp'] = pd.to_datetime(df['timestamp'], unit='ms')
            df.set_index('timestamp', inplace=True)
            self.logger.info(f"Fetched {len(df)} data points for {self.symbol}")
            return df
        except Exception as e:
            self.logger.error(f"Error fetching market data: {e}")
            return pd.DataFrame()
    
    def calculate_indicators(self, df: pd.DataFrame) -> pd.DataFrame:
        """
        Calculate technical indicators
        
        Args:
            df (pd.DataFrame): OHLCV data
            
        Returns:
            pd.DataFrame: Data with indicators added
        """
        if df.empty:
            return df
        
        df = df.copy()

        df[f'SMA_{self.sma_short}'] = df['close'].rolling(window=self.sma_short).mean()
        df[f'SMA_{self.sma_long}'] = df['close'].rolling(window=self.sma_long).mean()
        df['EMA_fast'] = df['close'].ewm(span=self.sma_short, adjust=False).mean()
        df['EMA_slow'] = df['close'].ewm(span=self.sma_long, adjust=False).mean()

        delta = df['close'].diff()
        gain = delta.clip(lower=0)
        loss = -delta.clip(upper=0)
        avg_gain = gain.ewm(alpha=1 / self.rsi_period, adjust=False, min_periods=self.rsi_period).mean()
        avg_loss = loss.ewm(alpha=1 / self.rsi_period, adjust=False, min_periods=self.rsi_period).mean()
        rs = avg_gain / avg_loss.replace(0, np.nan)
        df['RSI'] = (100 - (100 / (1 + rs))).fillna(50)

        exp1 = df['close'].ewm(span=12, adjust=False).mean()
        exp2 = df['close'].ewm(span=26, adjust=False).mean()
        df['MACD'] = exp1 - exp2
        df['MACD_signal'] = df['MACD'].ewm(span=9, adjust=False).mean()
        df['MACD_histogram'] = df['MACD'] - df['MACD_signal']

        df['BB_middle'] = df['close'].rolling(window=20).mean()
        bb_std = df['close'].rolling(window=20).std()
        df['BB_upper'] = df['BB_middle'] + (bb_std * 2)
        df['BB_lower'] = df['BB_middle'] - (bb_std * 2)
        df['bb_zscore'] = (df['close'] - df['BB_middle']) / bb_std.replace(0, np.nan)

        df['Volume_MA'] = df['volume'].ewm(span=20, adjust=False).mean()
        df['Volume_ratio'] = df['volume'] / df['Volume_MA'].replace(0, np.nan)
        df['quote_volume'] = df['close'] * df['volume']

        df['returns'] = df['close'].pct_change()
        df['log_returns'] = np.log(df['close'] / df['close'].shift(1))
        df['volatility'] = df['returns'].rolling(window=self.config.get('volatility_period', 20)).std() * np.sqrt(252)

        previous_close = df['close'].shift(1)
        true_range = pd.concat(
            [
                (df['high'] - df['low']).abs(),
                (df['high'] - previous_close).abs(),
                (df['low'] - previous_close).abs(),
            ],
            axis=1,
        ).max(axis=1)
        df['ATR'] = true_range.ewm(alpha=1 / self.atr_period, adjust=False, min_periods=self.atr_period).mean()
        df['atr_percent'] = df['ATR'] / df['close'].replace(0, np.nan)

        low_14 = df['low'].rolling(window=14).min()
        high_14 = df['high'].rolling(window=14).max()
        stochastic_range = (high_14 - low_14).replace(0, np.nan)
        df['stochastic_k'] = 100 * ((df['close'] - low_14) / stochastic_range)
        df['stochastic_d'] = df['stochastic_k'].rolling(window=3).mean()

        trend_period = self.config.get('trend_period', 50)
        df['trend'] = df['close'].rolling(window=trend_period).mean()
        df['trend_change'] = df['trend'].pct_change()
        df['trend_strength'] = (df['EMA_fast'] - df['EMA_slow']) / df['EMA_slow'].replace(0, np.nan)

        momentum_lookback = max(5, self.sma_short // 2)
        df['price_momentum'] = df['close'].pct_change(momentum_lookback)
        df['range_high_20'] = df['high'].rolling(window=20).max()
        df['range_low_20'] = df['low'].rolling(window=20).min()
        df['range_position'] = (df['close'] - df['range_low_20']) / (df['range_high_20'] - df['range_low_20']).replace(0, np.nan)
        df['breakout_pressure'] = (df['close'] - df['range_high_20'].shift(1)) / df['close'].replace(0, np.nan)
        df['drawdown_from_high'] = (df['close'] / df['range_high_20'].replace(0, np.nan)) - 1

        self.logger.info("Technical indicators calculated")
        return df

    def _classify_regime(self, trend_strength: float, atr_percent: float, volume_ratio: float) -> str:
        """Turn raw market diagnostics into a readable regime label."""
        if trend_strength > 0.018 and volume_ratio >= 1.0:
            return "Expansion"
        if trend_strength > 0.008:
            return "Constructive"
        if trend_strength < -0.018:
            return "Risk-Off"
        if atr_percent > self.max_volatility_ceiling:
            return "Shock"
        return "Neutral"

    def build_signal_snapshot(self, df: pd.DataFrame, entry_price: Optional[float] = None, position: Optional[Dict] = None) -> Dict:
        """Build a weighted signal and risk view from the latest market data."""
        neutral_snapshot = {
            'timestamp': datetime.now().isoformat(),
            'action': 'HOLD',
            'regime': 'Unavailable',
            'buy_score': 50.0,
            'sell_score': 50.0,
            'confidence': 50.0,
            'current_price': 0.0,
            'atr': 0.0,
            'atr_percent': 0.0,
            'volume_ratio': 0.0,
            'quote_volume': 0.0,
            'trend_strength': 0.0,
            'volatility': 0.0,
            'risk_reward': 0.0,
            'recommended_size': 0.0,
            'stop_distance_pct': self.stop_loss,
            'stop_price': 0.0,
            'target_price': 0.0,
            'trailing_stop_price': 0.0,
            'bias': 0.0,
            'reasons': ['Waiting for enough market data to build a signal.'],
            'risk_flags': ['Data availability'],
            'filters': {},
        }

        if df.empty or len(df) < max(self.sma_long + 5, 60):
            return neutral_snapshot

        latest = df.iloc[-1]
        current_price = float(latest['close'])
        atr_percent = float(latest.get('atr_percent', 0.0) or 0.0)
        volume_ratio = float(latest.get('Volume_ratio', 0.0) or 0.0)
        quote_volume = float(latest.get('quote_volume', 0.0) or 0.0)
        trend_strength = float(latest.get('trend_strength', 0.0) or 0.0)
        volatility = float(latest.get('volatility', 0.0) or 0.0)

        trend_component = np.tanh(trend_strength * 90)
        momentum_component = np.tanh(float(latest.get('price_momentum', 0.0) or 0.0) * 16)
        macd_component = np.tanh(self._safe_div(float(latest.get('MACD_histogram', 0.0) or 0.0), current_price, 0.0) * 450)
        mean_reversion_component = -np.tanh(float(latest.get('bb_zscore', 0.0) or 0.0) / 1.4)
        rsi_component = self._clamp((50 - float(latest.get('RSI', 50.0) or 50.0)) / 25, -1, 1)
        stochastic_component = self._clamp((50 - float(latest.get('stochastic_k', 50.0) or 50.0)) / 35, -1, 1)
        volume_component = self._clamp((volume_ratio - 1.0) / max(self.volume_surge_threshold - 1.0, 0.05), -1.0, 1.25)
        volatility_fit = 1 - min(abs(atr_percent - self.config.get('volatility_threshold', 0.05)) / max(self.config.get('volatility_threshold', 0.05), 0.01), 2.0)
        volatility_component = self._clamp(volatility_fit, -1, 1)

        buy_score = self._clamp(
            50
            + 18 * trend_component
            + 12 * momentum_component
            + 12 * macd_component
            + 10 * mean_reversion_component
            + 8 * rsi_component
            + 5 * stochastic_component
            + 7 * volume_component
            + 6 * volatility_component,
            0,
            100,
        )
        sell_score = self._clamp(
            50
            - 16 * trend_component
            - 10 * momentum_component
            - 12 * macd_component
            - 8 * mean_reversion_component
            - 8 * rsi_component
            - 5 * stochastic_component
            - 5 * volume_component
            - 4 * volatility_component,
            0,
            100,
        )

        bias = buy_score - sell_score
        confidence = self._clamp(max(buy_score, sell_score), 0, 100)
        regime = self._classify_regime(trend_strength, atr_percent, volume_ratio)

        trend_pass = (not self.config.get('use_trend_filter', True)) or trend_strength >= self.config.get('trend_threshold', 0.01)
        volume_pass = quote_volume >= self.min_volume and volume_ratio >= self.volume_surge_threshold
        volatility_pass = (not self.config.get('use_volatility_filter', True)) or (
            atr_percent >= self.config.get('volatility_threshold', 0.05) * 0.45
            and atr_percent <= self.max_volatility_ceiling
        )

        stop_distance_pct = max(self.stop_loss, atr_percent * self.atr_stop_multiple)
        risk_reward = self._safe_div(self.take_profit, stop_distance_pct, self.config.get('risk_reward_ratio', 1.0))
        recommended_size = self.calculate_dynamic_position_size(current_price, stop_distance_pct)
        estimated_entry_price = current_price * (1 + (self.paper_slippage_bps / 10000.0 if self.config.get('enable_paper_trading', False) else 0.0))

        stop_price = current_price * (1 - stop_distance_pct)
        target_price = current_price * (1 + max(self.take_profit, stop_distance_pct * self.config.get('risk_reward_ratio', 1.0)))
        trailing_stop_price = current_price * (1 - max(atr_percent * self.trailing_stop_multiple, self.stop_loss * 0.7))
        position_age_hours = 0.0

        if position:
            opened_at = position.get('timestamp')
            opened_at = opened_at if isinstance(opened_at, datetime) else self._deserialize_datetime(opened_at)
            if opened_at:
                position_age_hours = max(0.0, (datetime.now() - opened_at).total_seconds() / 3600.0)

        reasons = []
        if trend_component > 0.15:
            reasons.append("Trend structure remains constructive.")
        if momentum_component > 0.12:
            reasons.append("Momentum is expanding in favor of continuation.")
        if macd_component > 0.08:
            reasons.append("MACD histogram is improving.")
        if mean_reversion_component > 0.10:
            reasons.append("Price is leaning toward a favorable reversion zone.")
        if volume_component > 0.10:
            reasons.append("Volume participation is supportive.")
        if regime in {'Risk-Off', 'Shock'}:
            reasons.append("Market regime is defensive.")
        if not reasons:
            reasons.append("Signal stack is mixed and calls for patience.")

        risk_flags = []
        if not trend_pass:
            risk_flags.append("Trend filter not satisfied")
        if not volume_pass:
            risk_flags.append("Liquidity or participation is too soft")
        if not volatility_pass:
            risk_flags.append("Volatility profile is outside the preferred range")
        if risk_reward < 1.0:
            risk_flags.append("Risk-reward profile is not compelling")

        buy_blockers = []
        buy_blocker_tags = []
        if bias < 6:
            buy_blockers.append(f"Bias needs to reach 6.0 or better. Current bias is {bias:.1f}.")
            buy_blocker_tags.append("bias")
        if buy_score < self.buy_score_threshold:
            buy_blockers.append(f"Buy score needs to reach {self.buy_score_threshold:.1f}. Current buy score is {buy_score:.1f}.")
            buy_blocker_tags.append("score")
        if confidence < self.min_signal_confidence:
            buy_blockers.append(f"Confidence needs to reach {self.min_signal_confidence:.1f}. Current confidence is {confidence:.1f}.")
            buy_blocker_tags.append("confidence")
        if not trend_pass:
            buy_blockers.append("Trend filter is not satisfied yet.")
            buy_blocker_tags.append("trend")
        if not volume_pass:
            buy_blockers.append(
                f"Volume participation is too soft. Need quote volume >= {self.min_volume:,.0f} and volume ratio >= {self.volume_surge_threshold:.2f}."
            )
            buy_blocker_tags.append("volume")
        if not volatility_pass:
            buy_blockers.append("Volatility is outside the preferred trading range.")
            buy_blocker_tags.append("volatility")
        if recommended_size <= 0:
            buy_blockers.append("Risk limits currently reduce the recommended position size to zero.")
            buy_blocker_tags.append("size")
        if risk_reward < 1.0:
            buy_blockers.append(f"Risk-reward is below 1.0. Current ratio is {risk_reward:.2f}.")
            buy_blocker_tags.append("r:r")
        for restriction in self.get_entry_restrictions():
            buy_blockers.append(restriction)
            buy_blocker_tags.append("timing")

        action = 'HOLD'
        if bias >= 6 and buy_score >= self.buy_score_threshold and confidence >= self.min_signal_confidence and trend_pass and volume_pass and volatility_pass:
            action = 'BUY'
            if not self.get_entry_restrictions() and recommended_size > 0 and risk_reward >= 1.0:
                buy_blockers = ["Buy setup is active now."]
                buy_blocker_tags = ["ready"]
            else:
                buy_blockers.insert(0, "Market setup is active, but an execution gate is still blocking entry.")
                buy_blocker_tags.insert(0, "gate")
        elif entry_price is not None:
            unrealized_return = self._safe_div(current_price - entry_price, entry_price, 0.0)
            if unrealized_return <= -stop_distance_pct:
                action = 'SELL'
                risk_flags.append("Stop discipline engaged")
            elif unrealized_return >= self.take_profit:
                action = 'SELL'
                reasons.append("Take-profit target is in range.")
            elif sell_score >= self.sell_score_threshold and abs(bias) >= 4 and confidence >= self.min_signal_confidence - 2:
                action = 'SELL'

            if position:
                high_water_mark = max(float(position.get('highest_price', entry_price)), current_price)
                trailing_stop_price = high_water_mark * (1 - max(atr_percent * self.trailing_stop_multiple, self.stop_loss * 0.7))
                if current_price <= trailing_stop_price:
                    action = 'SELL'
                    risk_flags.append("Trailing stop breached")
                if self.max_hold_hours > 0 and position_age_hours >= self.max_hold_hours:
                    action = 'SELL'
                    risk_flags.append("Max hold time reached")
                    reasons.append(f"Position age reached {position_age_hours:.1f} hours.")

        buy_gate_ready = action == 'BUY' and not self.get_entry_restrictions() and recommended_size > 0 and risk_reward >= 1.0

        return {
            'timestamp': datetime.now().isoformat(),
            'action': action,
            'regime': regime,
            'buy_score': round(buy_score, 2),
            'sell_score': round(sell_score, 2),
            'confidence': round(confidence, 2),
            'current_price': current_price,
            'atr': float(latest.get('ATR', 0.0) or 0.0),
            'atr_percent': atr_percent,
            'volume_ratio': volume_ratio,
            'quote_volume': quote_volume,
            'trend_strength': trend_strength,
            'volatility': volatility,
            'risk_reward': risk_reward,
            'recommended_size': recommended_size,
            'estimated_entry_price': estimated_entry_price,
            'stop_distance_pct': stop_distance_pct,
            'stop_price': stop_price,
            'target_price': target_price,
            'trailing_stop_price': trailing_stop_price,
            'position_age_hours': position_age_hours,
            'bias': round(bias, 2),
            'reasons': reasons,
            'risk_flags': risk_flags,
            'buy_blockers': buy_blockers,
            'buy_blocker_tags': buy_blocker_tags,
            'buy_gate_status': 'READY' if buy_gate_ready else 'WAITING',
            'filters': {
                'trend_pass': trend_pass,
                'volume_pass': volume_pass,
                'volatility_pass': volatility_pass,
            },
        }

    def analyze_market(self, refresh: bool = True, limit: Optional[int] = None, entry_price: Optional[float] = None, position: Optional[Dict] = None) -> Dict:
        """Refresh market data and produce the latest signal snapshot."""
        if refresh or self.latest_market_frame.empty:
            df = self.get_market_data(limit=max(int(limit or self.market_history_limit), self.sma_long * 4, 120))
            if df.empty:
                self.latest_market_frame = pd.DataFrame()
                self.latest_signal_snapshot = self.build_signal_snapshot(df, entry_price=entry_price, position=position)
                return self.latest_signal_snapshot
            self.latest_market_frame = self.calculate_indicators(df)

        self.latest_signal_snapshot = self.build_signal_snapshot(self.latest_market_frame, entry_price=entry_price, position=position)
        return self.latest_signal_snapshot
    
    def should_buy(self, df: pd.DataFrame, signal_snapshot: Optional[Dict] = None) -> bool:
        """
        Determine if buy signal is present
        
        Args:
            df (pd.DataFrame): Data with indicators
            
        Returns:
            bool: True if buy signal
        """
        if df.empty or len(df) < self.sma_long + 1:
            return False
        
        signal_snapshot = signal_snapshot or self.build_signal_snapshot(df)
        buy_signal = signal_snapshot.get('action') == 'BUY' and signal_snapshot.get('buy_gate_status') == 'READY'

        if buy_signal:
            self.logger.info(
                f"Buy signal detected for {self.symbol} | "
                f"buy_score={signal_snapshot.get('buy_score')} "
                f"confidence={signal_snapshot.get('confidence')} "
                f"regime={signal_snapshot.get('regime')}"
            )

        return buy_signal
    
    def should_sell(self, df: pd.DataFrame, entry_price: float, position: Optional[Dict] = None, signal_snapshot: Optional[Dict] = None) -> bool:
        """
        Determine if sell signal is present
        
        Args:
            df (pd.DataFrame): Data with indicators
            entry_price (float): Price when position was opened
            
        Returns:
            bool: True if sell signal
        """
        if df.empty:
            return False
        
        signal_snapshot = signal_snapshot or self.build_signal_snapshot(df, entry_price=entry_price, position=position)
        sell_signal = signal_snapshot.get('action') == 'SELL'

        if sell_signal:
            current_profit = self._safe_div(signal_snapshot.get('current_price', 0.0) - entry_price, entry_price, 0.0)
            self.logger.info(
                f"Sell signal detected for {self.symbol} | "
                f"sell_score={signal_snapshot.get('sell_score')} "
                f"confidence={signal_snapshot.get('confidence')} "
                f"profit={current_profit * 100:.2f}%"
            )

        return sell_signal
    
    def place_order(self, side: str, amount: float, price: Optional[float] = None, 
                   retry_count: int = 0) -> Optional[Dict]:
        """
        Place trading order with retry logic
        
        Args:
            side (str): 'buy' or 'sell'
            amount (float): Amount to trade
            price (float, optional): Limit price (if None, market order)
            retry_count (int): Number of retries attempted
            
        Returns:
            dict: Order information or None if failed
        """
        try:
            # Check if order would exceed slippage limit
            if price and self.config.get('max_slippage', 0.01) > 0:
                current_price = self.get_current_price()
                if side == 'buy' and price > current_price * (1 + self.config['max_slippage']):
                    self.logger.warning("Order price exceeds slippage limit")
                    return None
                elif side == 'sell' and price < current_price * (1 - self.config['max_slippage']):
                    self.logger.warning("Order price exceeds slippage limit")
                    return None
            
            # Paper trading mode
            if self.config.get('enable_paper_trading', False):
                order = self._execute_paper_order(side, amount, price)
                self.logger.info(
                    f"Paper order filled: {side} {order['amount']} {self.symbol} at {order['price']} "
                    f"| fee {order['fee']['cost']:.4f} {self.quote_currency}"
                )
                return order
            
            if price:
                order = self.exchange.create_limit_order(
                    symbol=self.symbol,
                    side=side,
                    amount=amount,
                    price=price
                )
                self.logger.info(f"Limit order placed: {side} {amount} {self.symbol} at {price}")
            else:
                order = self.exchange.create_market_order(
                    symbol=self.symbol,
                    side=side,
                    amount=amount
                )
                self.logger.info(f"Market order placed: {side} {amount} {self.symbol}")
            
            return order
            
        except Exception as e:
            self.logger.error(f"Error placing order: {e}")
            
            # Retry logic
            if self.stop_requested:
                return None

            if retry_count < self.config.get('max_retries', 3):
                delay = self.config.get('retry_delay', 10)
                self.logger.info(f"Retrying order in {delay} seconds... (attempt {retry_count + 1})")
                self.sleep_with_stop(delay)
                return self.place_order(side, amount, price, retry_count + 1)
            
            return None
    
    def get_current_price(self) -> float:
        """Get current market price"""
        try:
            ticker = self.exchange.fetch_ticker(self.symbol)
            return ticker['last']
        except Exception as e:
            self.logger.error(f"Error fetching current price: {e}")
            return 0.0
    
    def send_email_notification(self, subject: str, message: str):
        """
        Send email notification (if configured)
        
        Args:
            subject (str): Email subject
            message (str): Email message
        """
        if not self.config.get('email_notifications', False):
            return
            
        try:
            email_config = self.config.get('email_config', {})
            msg = MIMEMultipart()
            msg['From'] = email_config['email']
            msg['To'] = email_config['email']
            msg['Subject'] = subject
            
            msg.attach(MIMEText(message, 'plain'))
            
            server = smtplib.SMTP(email_config['smtp_server'], email_config['smtp_port'])
            server.starttls()
            server.login(email_config['email'], email_config['password'])
            text = msg.as_string()
            server.sendmail(email_config['email'], email_config['email'], text)
            server.quit()
            
            self.logger.info("Email notification sent")
            
        except Exception as e:
            self.logger.error(f"Failed to send email: {e}")
    
    def update_trade_history(self, trade_type: str, amount: float, price: float, 
                           profit_loss: float = 0.0, order_id: str = None):
        """
        Update trade history
        
        Args:
            trade_type (str): 'buy' or 'sell'
            amount (float): Amount traded
            price (float): Price at trade
            profit_loss (float): Profit or loss from trade
            order_id (str): Order identifier
        """
        trade_record = {
            'timestamp': datetime.now().isoformat(),
            'type': trade_type,
            'symbol': self.symbol,
            'amount': amount,
            'price': price,
            'profit_loss': profit_loss,
            'balance': self.get_account_balance(),
            'order_id': order_id
        }
        
        self.trade_history.append(trade_record)
        self.save_trade_to_database(trade_record)
        
        # Update statistics
        if trade_type == 'sell':
            self.total_trades += 1
            if profit_loss >= 0:
                self.win_trades += 1
                self.metrics['win_streak'] += 1
                self.metrics['loss_streak'] = 0
            else:
                self.loss_trades += 1
                self.metrics['loss_streak'] += 1
                self.metrics['win_streak'] = 0
            
            self.metrics['total_profit_loss'] += profit_loss
            self.metrics['equity_peak'] = max(self.metrics['equity_peak'], self.metrics['total_profit_loss'])
            current_drawdown = self.metrics['equity_peak'] - self.metrics['total_profit_loss']
            self.metrics['max_drawdown'] = max(self.metrics['max_drawdown'], current_drawdown)
            self.metrics['last_trade_time'] = datetime.now()
            if profit_loss < 0 and self.pause_after_loss_streak > 0 and self.metrics['loss_streak'] >= self.pause_after_loss_streak:
                self.set_loss_streak_pause(
                    self.loss_streak_cooldown_minutes,
                    f"Loss streak reached {self.metrics['loss_streak']} closed trades.",
                )
        
        self.logger.info(f"Trade recorded: {trade_type} {amount} {self.symbol} at {price}")
        self.save_runtime_state()
    
    def get_account_balance(self) -> Dict:
        """Get current account balance"""
        if self.config.get('enable_paper_trading', False):
            paper_snapshot = self.get_paper_account_snapshot()
            return {
                'free': {
                    self.quote_currency: paper_snapshot.get('cash_balance', 0.0),
                    self.base_currency: paper_snapshot.get('asset_balance', 0.0),
                },
                'used': {
                    self.quote_currency: 0.0,
                    self.base_currency: 0.0,
                },
                'total': {
                    self.quote_currency: paper_snapshot.get('cash_balance', 0.0),
                    self.base_currency: paper_snapshot.get('asset_balance', 0.0),
                },
                'info': {
                    'mode': 'paper',
                    'portfolio_value_quote': paper_snapshot.get('total_equity_quote', 0.0),
                    'fees_paid_quote': paper_snapshot.get('fees_paid_quote', 0.0),
                    'realized_pnl_quote': paper_snapshot.get('realized_pnl_quote', 0.0),
                    'unrealized_pnl_quote': paper_snapshot.get('unrealized_pnl_quote', 0.0),
                },
            }

        try:
            balance = self.exchange.fetch_balance()
            return balance
        except Exception as e:
            self.logger.error(f"Error fetching balance: {e}")
            return {}

    def get_portfolio_value(self) -> float:
        """Estimate the portfolio's USDT value."""
        if self.config.get('enable_paper_trading', False):
            return float(self.get_paper_account_snapshot().get('total_equity_quote', self.config.get('paper_balance', 0.0)) or 0.0)

        balance = self.get_account_balance()
        totals = balance.get('total', {}) if isinstance(balance, dict) else {}
        current_price = self.get_price_reference(refresh_market=False)
        quote_value = float(totals.get(self.quote_currency, 0.0) or 0.0)
        base_value = float(totals.get(self.base_currency, 0.0) or 0.0) * current_price if current_price > 0 else 0.0
        portfolio_value = quote_value + base_value

        if portfolio_value > 0:
            return portfolio_value

        return float(self.config.get('paper_balance', 0.0))

    def get_total_exposure(self) -> float:
        """Measure notional exposure across all open positions."""
        return sum(float(position.get('amount', 0.0)) * float(position.get('entry_price', 0.0)) for position in self.open_positions.values())

    def calculate_dynamic_position_size(self, current_price: float, stop_distance_pct: Optional[float] = None) -> float:
        """Translate portfolio risk rules into a recommended order size."""
        if current_price <= 0:
            return 0.0

        portfolio_value = max(self.get_portfolio_value(), self.config.get('paper_balance', 0.0), 1.0)
        stop_distance_pct = stop_distance_pct or self.stop_loss
        stop_distance_pct = max(stop_distance_pct, 0.001)

        if self.position_sizing_method == 'fixed':
            raw_size = self.position_size
        else:
            risk_budget = portfolio_value * self.risk_per_trade
            raw_size = risk_budget / (current_price * stop_distance_pct)

        max_symbol_size = (portfolio_value * self.max_symbol_exposure) / current_price
        remaining_portfolio_capacity = max((portfolio_value * self.max_portfolio_exposure) - self.get_total_exposure(), 0.0)
        if remaining_portfolio_capacity <= 0 or max_symbol_size <= 0:
            return 0.0

        max_portfolio_size = remaining_portfolio_capacity / current_price
        ceiling = min(max_symbol_size, max_portfolio_size, self.max_position_size)
        if ceiling < self.min_position_size:
            return 0.0

        clipped_size = min(raw_size, ceiling)
        clipped_size = max(clipped_size, self.min_position_size)
        return round(clipped_size, 8)

    def classify_risk_posture(self) -> str:
        """Summarize the portfolio's current operating posture."""
        portfolio_value = max(self.get_portfolio_value(), 1.0)
        exposure_ratio = self.get_total_exposure() / portfolio_value
        daily_loss_ratio = self._safe_div(self.daily_loss, self.max_daily_loss, 0.0)

        if daily_loss_ratio >= 0.9 or exposure_ratio >= self.max_portfolio_exposure * 0.9:
            return "Constrained"
        if daily_loss_ratio >= 0.6 or exposure_ratio >= self.max_portfolio_exposure * 0.65:
            return "Elevated"
        return "Disciplined"

    def get_preflight_status(self, signal_snapshot: Optional[Dict] = None) -> Dict:
        """Build an executive preflight view before the bot deploys capital."""
        signal_snapshot = signal_snapshot or (self.latest_signal_snapshot if self.latest_signal_snapshot else self.analyze_market(refresh=True))
        config_issues = self.validate_config()
        capability_checks = []
        paper_snapshot = self.get_paper_account_snapshot(signal_snapshot.get('current_price')) if self.config.get('enable_paper_trading', False) else {}

        capability_checks.append({
            'name': 'Configuration',
            'passed': not config_issues,
            'detail': 'Configuration is within enterprise guardrails.' if not config_issues else "; ".join(config_issues),
        })
        capability_checks.append({
            'name': 'Credential Posture',
            'passed': self.config.get('enable_paper_trading', False) or (bool(self.api_key) and bool(self.api_secret)),
            'detail': 'Paper trading mode active; API credentials are optional.' if self.config.get('enable_paper_trading', False) else 'Live credentials detected.',
        })
        capability_checks.append({
            'name': 'Simulation Ledger',
            'passed': (paper_snapshot.get('total_equity_quote', 0.0) > 0) if self.config.get('enable_paper_trading', False) else True,
            'detail': (
                f"{paper_snapshot.get('cash_balance', 0.0):.2f} {self.quote_currency} cash | "
                f"{paper_snapshot.get('asset_balance', 0.0):.6f} {self.base_currency} inventory"
            ) if self.config.get('enable_paper_trading', False) else 'Live settlement handled by exchange account.',
        })
        entry_restrictions = self.get_entry_restrictions()
        capability_checks.append({
            'name': 'Execution Timing',
            'passed': not entry_restrictions,
            'detail': 'Entries are clear to proceed.' if not entry_restrictions else "; ".join(entry_restrictions),
        })
        capability_checks.append({
            'name': 'Exposure Envelope',
            'passed': self.get_total_exposure() <= max(self.get_portfolio_value(), 1.0) * self.max_portfolio_exposure,
            'detail': f"Exposure posture: {self.classify_risk_posture()}",
        })
        capability_checks.append({
            'name': 'Signal Integrity',
            'passed': signal_snapshot.get('confidence', 0.0) >= self.min_signal_confidence - 8,
            'detail': f"Action {signal_snapshot.get('action', 'HOLD')} with confidence {signal_snapshot.get('confidence', 0.0):.1f}",
        })
        capability_checks.append({
            'name': 'Market Structure',
            'passed': all(signal_snapshot.get('filters', {}).values()) if signal_snapshot.get('filters') else False,
            'detail': f"Regime {signal_snapshot.get('regime', 'Unavailable')}",
        })

        readiness_score = round(100 * sum(1 for check in capability_checks if check['passed']) / max(len(capability_checks), 1), 1)
        readiness_status = "Mission Ready" if readiness_score >= 80 else "Conditional" if readiness_score >= 60 else "Hold"

        self.last_preflight = {
            'readiness_score': readiness_score,
            'readiness_status': readiness_status,
            'risk_posture': self.classify_risk_posture(),
            'checks': capability_checks,
            'summary': f"{readiness_status} | Regime {signal_snapshot.get('regime', 'Unavailable')} | Confidence {signal_snapshot.get('confidence', 0.0):.1f}",
        }
        return self.last_preflight
    
    def check_daily_loss_limit(self) -> bool:
        """Check if daily loss limit has been reached"""
        return self.daily_loss > self.max_daily_loss
    
    def init_database(self):
        """Initialize SQLite database for trade history"""
        try:
            db_file = self.runtime_dir / 'trading_history.db'
            conn = sqlite3.connect(db_file)
            cursor = conn.cursor()
            
            cursor.execute('''
                CREATE TABLE IF NOT EXISTS trades (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    timestamp TEXT,
                    type TEXT,
                    symbol TEXT,
                    amount REAL,
                    price REAL,
                    profit_loss REAL,
                    balance TEXT,
                    order_id TEXT
                )
            ''')
            
            conn.commit()
            conn.close()
            self.logger.info("Database initialized successfully")
            
        except Exception as e:
            self.logger.error(f"Database initialization failed: {e}")
    
    def save_trade_to_database(self, trade_record: Dict):
        """Save trade record to database"""
        try:
            db_file = self.runtime_dir / 'trading_history.db'
            conn = sqlite3.connect(db_file)
            cursor = conn.cursor()
            
            cursor.execute('''
                INSERT INTO trades (timestamp, type, symbol, amount, price, profit_loss, balance, order_id)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            ''', (
                trade_record['timestamp'],
                trade_record['type'],
                trade_record['symbol'],
                trade_record['amount'],
                trade_record['price'],
                trade_record['profit_loss'],
                str(trade_record['balance']),
                trade_record.get('order_id', '')
            ))
            
            conn.commit()
            conn.close()
            
        except Exception as e:
            self.logger.error(f"Failed to save trade to database: {e}")
    
    def get_trade_statistics(self) -> Dict:
        """Get trading statistics"""
        if self.total_trades == 0:
            win_rate = 0.0
        else:
            win_rate = self.win_trades / self.total_trades

        realized_returns = [trade['profit_loss'] for trade in self.trade_history if trade['type'] == 'sell']
        gross_profit = sum(value for value in realized_returns if value > 0)
        gross_loss = abs(sum(value for value in realized_returns if value < 0))
        average_return = float(np.mean(realized_returns)) if realized_returns else 0.0
        profit_factor = gross_profit / gross_loss if gross_loss else (gross_profit if gross_profit else 0.0)
            
        return {
            'total_trades': self.total_trades,
            'win_trades': self.win_trades,
            'loss_trades': self.loss_trades,
            'win_rate': win_rate,
            'daily_loss': self.daily_loss,
            'open_positions': len(self.open_positions),
            'total_profit_loss': self.metrics['total_profit_loss'],
            'average_return': average_return,
            'profit_factor': profit_factor,
            'max_drawdown': self.metrics['max_drawdown'],
            'win_streak': self.metrics['win_streak'],
            'loss_streak': self.metrics['loss_streak']
        }
    
    def get_bot_status(self) -> Dict:
        """Get current bot status"""
        signal_snapshot = self.latest_signal_snapshot or self.analyze_market(refresh=False)
        preflight = self.last_preflight or self.get_preflight_status(signal_snapshot)
        return {
            'symbol': self.symbol,
            'open_positions': len(self.open_positions),
            'daily_loss': self.daily_loss,
            'last_trade_time': self.metrics['last_trade_time'],
            'account_balance': self.get_account_balance(),
            'trade_statistics': self.get_trade_statistics(),
            'signal_snapshot': signal_snapshot,
            'preflight': preflight,
            'uptime': str(datetime.now() - self.start_time)
        }
    
    def save_config(self):
        """Save current configuration to file"""
        save_bot_config_file(self.config_file, self.config)
        self.logger.info("Configuration saved")

    def request_stop(self):
        """Ask the trading loop to stop after the current operation."""
        self.stop_requested = True
        self.logger.info("Stop requested by controller")
        self.save_runtime_state()

    def sleep_with_stop(self, seconds: float):
        """Sleep in short intervals so external controllers can stop the loop."""
        deadline = time.time() + max(0.0, seconds)

        while time.time() < deadline:
            if self.stop_requested:
                break
            time.sleep(min(1.0, max(0.0, deadline - time.time())))

    def schedule_next_cycle_wait(self, seconds: float):
        """Record when the next scan should occur and persist it for the UI."""
        wait_seconds = max(0.0, float(seconds))
        self.last_cycle_completed_at = datetime.now()
        self.next_cycle_due_at = self.last_cycle_completed_at + timedelta(seconds=wait_seconds)
        self.save_runtime_state()

    def get_command_deck_payload(self, refresh_market_data: bool = True) -> Dict:
        """Assemble a single payload tailored for the round-two dashboard."""
        signal_snapshot = self.analyze_market(refresh=refresh_market_data)
        preflight = self.get_preflight_status(signal_snapshot)
        metrics = self.get_bot_metrics()
        stats = self.get_trade_statistics()
        paper_line = ""
        recent_trades_text = self.render_recent_trades()

        if self.config.get('enable_paper_trading', False):
            paper_line = (
                f"\nPaper Ledger: {metrics.get('paper_cash', 0.0):,.2f} {metrics.get('quote_currency', self.quote_currency)} cash | "
                f"{metrics.get('paper_asset_balance', 0.0):.6f} {metrics.get('base_currency', self.base_currency)} inventory"
            )

        executive_brief = (
            f"Directive: {signal_snapshot.get('action', 'HOLD')}\n"
            f"Regime: {signal_snapshot.get('regime', 'Unavailable')}\n"
            f"Readiness: {preflight.get('readiness_status', 'Unknown')} ({preflight.get('readiness_score', 0):.1f})\n"
            f"Risk Posture: {metrics.get('risk_posture', 'Unknown')}\n"
            f"Would Buy At: {signal_snapshot.get('estimated_entry_price', 0.0):,.2f}\n"
            f"Buy Gate: {signal_snapshot.get('buy_gate_status', 'WAITING')}\n"
            f"Blocked Because: {' | '.join(signal_snapshot.get('buy_blockers', [])[:3]) or 'None'}\n"
            f"Rationale: {' '.join(signal_snapshot.get('reasons', []))}"
            f"{paper_line}"
        )

        signal_stack = "\n".join(
            [
                f"Buy Score: {signal_snapshot.get('buy_score', 0):.1f}",
                f"Sell Score: {signal_snapshot.get('sell_score', 0):.1f}",
                f"Confidence: {signal_snapshot.get('confidence', 0):.1f}",
                f"Bias: {signal_snapshot.get('bias', 0):.1f}",
                f"Would Buy At: {signal_snapshot.get('estimated_entry_price', 0):,.2f}",
                f"ATR %: {signal_snapshot.get('atr_percent', 0) * 100:.2f}%",
                f"Volume Ratio: {signal_snapshot.get('volume_ratio', 0):.2f}",
                f"Risk / Reward: {signal_snapshot.get('risk_reward', 0):.2f}",
                f"Recommended Size: {signal_snapshot.get('recommended_size', 0):.6f}",
                f"Stop Price: {signal_snapshot.get('stop_price', 0):,.2f}",
                f"Target Price: {signal_snapshot.get('target_price', 0):,.2f}",
                f"Buy Gate: {signal_snapshot.get('buy_gate_status', 'WAITING')}",
                f"Blocked Because: {' | '.join(signal_snapshot.get('buy_blockers', [])) or 'None'}",
                f"Risk Flags: {', '.join(signal_snapshot.get('risk_flags', [])) or 'None'}",
            ]
        )

        preflight_text = "\n".join(
            f"[{'PASS' if check['passed'] else 'HOLD'}] {check['name']}: {check['detail']}"
            for check in preflight.get('checks', [])
        )

        return {
            'metrics': metrics,
            'stats': stats,
            'signal': signal_snapshot,
            'preflight': preflight,
            'executive_brief': executive_brief,
            'signal_stack': signal_stack,
            'preflight_text': preflight_text,
            'recent_trades_text': recent_trades_text,
            'report': self.generate_report(),
        }

    def render_recent_trades(self, limit: int = 8) -> str:
        """Render a concise recent-trades ledger for the dashboard."""
        if not self.trade_history:
            return "No trades have been recorded in this session yet."

        lines = []
        for trade in reversed(self.trade_history[-limit:]):
            pnl_text = "--"
            if trade.get('type') == 'sell':
                pnl_text = f"{float(trade.get('profit_loss', 0.0)) * 100:.2f}%"
            lines.append(
                f"{str(trade.get('timestamp', ''))[:19]} | "
                f"{str(trade.get('type', '')).upper():4} | "
                f"{float(trade.get('amount', 0.0)):.6f} @ {float(trade.get('price', 0.0)):,.2f} | "
                f"P/L {pnl_text}"
            )

        return "\n".join(lines)
    
    def get_bot_metrics(self) -> Dict:
        """Get comprehensive bot metrics"""
        stats = self.get_trade_statistics()
        signal_snapshot = self.latest_signal_snapshot or self.analyze_market(refresh=False)
        paper_snapshot = self.get_paper_account_snapshot(signal_snapshot.get('current_price')) if self.config.get('enable_paper_trading', False) else {}
        portfolio_value = float(paper_snapshot.get('total_equity_quote', 0.0)) if paper_snapshot else self.get_portfolio_value()
        preflight = self.last_preflight or self.get_preflight_status(signal_snapshot)
        exposure_value = self.get_total_exposure()
        exposure_ratio = self._safe_div(exposure_value, portfolio_value, 0.0)
        cooldown_remaining = self._minutes_until(self.cooldown_until)
        pause_remaining = self._minutes_until(self.pause_until)
        next_scan_seconds = 0.0
        if self.next_cycle_due_at:
            next_scan_seconds = max(0.0, (self.next_cycle_due_at - datetime.now()).total_seconds())
        last_trade_time = self.metrics.get('last_trade_time')
        last_trade_label = last_trade_time.strftime('%Y-%m-%d %H:%M:%S') if isinstance(last_trade_time, datetime) else "None yet"
        
        return {
            'portfolio_value': portfolio_value,
            'exposure_value': exposure_value,
            'exposure_ratio': exposure_ratio,
            'total_trades': stats['total_trades'],
            'win_rate': stats['win_rate'],
            'daily_loss': self.daily_loss,
            'open_positions': len(self.open_positions),
            'max_daily_loss': self.max_daily_loss,
            'total_profit_loss': stats['total_profit_loss'],
            'average_return': stats['average_return'],
            'profit_factor': stats['profit_factor'],
            'max_drawdown': stats['max_drawdown'],
            'win_streak': stats['win_streak'],
            'loss_streak': stats['loss_streak'],
            'risk_posture': preflight['risk_posture'],
            'readiness_score': preflight['readiness_score'],
            'readiness_status': preflight['readiness_status'],
            'signal_action': signal_snapshot.get('action', 'HOLD'),
            'signal_confidence': signal_snapshot.get('confidence', 50.0),
            'buy_score': signal_snapshot.get('buy_score', 50.0),
            'sell_score': signal_snapshot.get('sell_score', 50.0),
            'regime': signal_snapshot.get('regime', 'Unavailable'),
            'recommended_size': signal_snapshot.get('recommended_size', 0.0),
            'uptime': str(datetime.now() - self.start_time),
            'paper_cash': paper_snapshot.get('cash_balance', 0.0),
            'paper_asset_balance': paper_snapshot.get('asset_balance', 0.0),
            'paper_asset_value': paper_snapshot.get('asset_value_quote', 0.0),
            'paper_fees_paid': paper_snapshot.get('fees_paid_quote', 0.0),
            'paper_realized_pnl': paper_snapshot.get('realized_pnl_quote', 0.0),
            'paper_unrealized_pnl': paper_snapshot.get('unrealized_pnl_quote', 0.0),
            'quote_currency': self.quote_currency,
            'base_currency': self.base_currency,
            'cooldown_remaining_minutes': cooldown_remaining,
            'cooldown_label': self.format_minutes_remaining(cooldown_remaining),
            'pause_remaining_minutes': pause_remaining,
            'pause_label': self.format_minutes_remaining(pause_remaining),
            'next_scan_seconds': next_scan_seconds,
            'next_scan_label': self.format_minutes_remaining(next_scan_seconds / 60.0),
            'last_trade_label': last_trade_label,
        }
    
    def run_trading_cycle(self):
        """
        Main trading loop - runs continuously
        """
        self.logger.info("Starting trading bot...")
        self.stop_requested = False
        self.next_cycle_due_at = None
        
        while not self.stop_requested:
            try:
                self.reset_daily_guardrails_if_needed()
                self.next_cycle_due_at = None
                config_issues = self.validate_config()
                if config_issues:
                    self.logger.error(f"Config validation failed: {'; '.join(config_issues)}")
                    self.schedule_next_cycle_wait(60)
                    self.sleep_with_stop(60)
                    continue

                # Check if trading is enabled
                if not self.config.get('trading_enabled', True):
                    self.logger.info("Trading disabled in config")
                    self.schedule_next_cycle_wait(60)
                    self.sleep_with_stop(60)
                    continue
                
                # Check daily loss limit
                if self.check_daily_loss_limit():
                    self.logger.warning("Daily loss limit reached, skipping trades")
                    self.schedule_next_cycle_wait(300)
                    self.sleep_with_stop(300)  # Wait 5 minutes
                    continue
                
                # Get market data
                df = self.get_market_data(limit=self.market_history_limit)
                if df.empty:
                    self.schedule_next_cycle_wait(60)
                    self.sleep_with_stop(60)
                    continue
                
                # Calculate indicators
                df = self.calculate_indicators(df)
                self.latest_market_frame = df
                market_signal = self.build_signal_snapshot(df)
                self.latest_signal_snapshot = market_signal
                self.get_preflight_status(market_signal)
                entry_restrictions = self.get_entry_restrictions()
                
                # Check for buy signals
                if len(self.open_positions) < self.max_concurrent_trades:
                    if entry_restrictions:
                        self.logger.info(f"Entry pause active: {'; '.join(entry_restrictions)}")
                    elif self.should_buy(df, market_signal):
                        trade_amount = market_signal.get('recommended_size', 0.0)
                        if trade_amount <= 0:
                            self.logger.warning("Signal approved but recommended position size is zero.")
                            self.schedule_next_cycle_wait(self.config.get('check_interval', 60))
                            self.sleep_with_stop(self.config.get('check_interval', 60))
                            continue
                        # Place buy order
                        order = self.place_order('buy', trade_amount)
                        if order:
                            filled_amount = float(order.get('amount', trade_amount))
                            entry_price = order.get('price', self.get_current_price())
                            entry_cost_basis = abs(float(order.get('quote_delta', filled_amount * entry_price)))
                            stop_price = entry_price * (1 - market_signal.get('stop_distance_pct', self.stop_loss))
                            target_price = entry_price * (1 + max(self.take_profit, market_signal.get('stop_distance_pct', self.stop_loss) * self.config.get('risk_reward_ratio', 1.0)))
                            self.open_positions[order['id']] = {
                                'symbol': self.symbol,
                                'type': 'buy',
                                'amount': filled_amount,
                                'entry_price': entry_price,
                                'timestamp': datetime.now(),
                                'highest_price': entry_price,
                                'stop_price': stop_price,
                                'target_price': target_price,
                                'trailing_stop_price': market_signal.get('trailing_stop_price', stop_price),
                                'entry_signal': market_signal,
                                'entry_cost_basis': entry_cost_basis,
                                'entry_fee_quote': float(order.get('fee', {}).get('cost', 0.0) or 0.0),
                            }
                            self.update_trade_history('buy', filled_amount, entry_price, order_id=order['id'])
                            self.set_trade_cooldown(self.trade_cooldown_minutes, "Entry executed")
                            
                            # Send notification
                            self.send_email_notification(
                                "Buy Order Placed",
                                f"Bot placed buy order for {self.symbol}\n"
                                f"Amount: {filled_amount}\n"
                                f"Price: {entry_price}\n"
                                f"Regime: {market_signal.get('regime')}\n"
                                f"Signal Confidence: {market_signal.get('confidence'):.1f}\n"
                                f"Order ID: {order['id']}"
                            )
                
                # Check for sell signals on open positions
                current_positions = self.open_positions.copy()
                for order_id, position in current_positions.items():
                    if position['type'] == 'buy':
                        position['highest_price'] = max(float(position.get('highest_price', position['entry_price'])), float(df.iloc[-1]['close']))
                        sell_signal = self.build_signal_snapshot(df, entry_price=position['entry_price'], position=position)

                        if self.should_sell(df, position['entry_price'], position=position, signal_snapshot=sell_signal):
                            # Place sell order
                            order = self.place_order('sell', position['amount'])
                            if order:
                                filled_amount = float(order.get('amount', position['amount']))
                                exit_price = order.get('price', position['entry_price'])
                                exit_value = float(order.get('quote_delta', exit_price * filled_amount))
                                entry_cost_basis = float(position.get('entry_cost_basis', position['entry_price'] * filled_amount))
                                realized_pnl_quote = exit_value - entry_cost_basis
                                profit_loss = realized_pnl_quote / max(entry_cost_basis, 1e-9)
                                if self.config.get('enable_paper_trading', False):
                                    self.paper_state['realized_pnl_quote'] = float(self.paper_state.get('realized_pnl_quote', 0.0)) + realized_pnl_quote
                                self.daily_loss += max(0.0, -profit_loss)
                                
                                # Update trade history
                                self.update_trade_history('sell', filled_amount, exit_price, profit_loss, order_id=order['id'])
                                self.set_trade_cooldown(self.trade_cooldown_minutes, "Exit executed")
                                
                                # Remove from open positions
                                del self.open_positions[order_id]
                                
                                # Send notification
                                self.send_email_notification(
                                    "Sell Order Placed",
                                    f"Bot placed sell order for {self.symbol}\n"
                                    f"Amount: {filled_amount}\n"
                                    f"Entry Price: {position['entry_price']}\n"
                                    f"Exit Price: {exit_price}\n"
                                    f"Regime: {sell_signal.get('regime')}\n"
                                    f"Exit Trigger: {', '.join(sell_signal.get('risk_flags', [])[:2]) or 'Signal rotation'}\n"
                                    f"Profit/Loss: {profit_loss*100:.2f}%\n"
                                    f"Order ID: {order['id']}"
                                )
                
                # Print statistics every 10 cycles
                if self.total_trades % 10 == 0 and self.total_trades > 0:
                    stats = self.get_trade_statistics()
                    self.logger.info(f"Trading Stats - Total: {stats['total_trades']}, "
                                   f"Win Rate: {stats['win_rate']*100:.1f}%, "
                                   f"Open Positions: {stats['open_positions']}, "
                                   f"Win Streak: {stats['win_streak']}")
                
                # Wait before next check
                wait_seconds = self.config.get('check_interval', 60)
                self.schedule_next_cycle_wait(wait_seconds)
                self.logger.info(f"Waiting {wait_seconds} seconds...")
                self.sleep_with_stop(wait_seconds)
                
            except KeyboardInterrupt:
                self.logger.info("Bot stopped by user")
                break
            except Exception as e:
                self.logger.error(f"Error in trading cycle: {e}")
                self.schedule_next_cycle_wait(60)
                self.sleep_with_stop(60)  # Wait before retrying

        self.logger.info("Trading loop stopped")
        self.next_cycle_due_at = None
        self.save_runtime_state()
    
    def generate_report(self) -> str:
        """Generate a trading report"""
        stats = self.get_trade_statistics()
        metrics = self.get_bot_metrics()
        signal_snapshot = self.latest_signal_snapshot or self.analyze_market(refresh=False)
        preflight = self.last_preflight or self.get_preflight_status(signal_snapshot)
        paper_section = ""

        if self.config.get('enable_paper_trading', False):
            paper_section = f"""
Paper Ledger:
- Cash Balance: {metrics['paper_cash']:.2f} {metrics['quote_currency']}
- Inventory: {metrics['paper_asset_balance']:.6f} {metrics['base_currency']}
- Inventory Value: {metrics['paper_asset_value']:.2f} {metrics['quote_currency']}
- Realized P&L: {metrics['paper_realized_pnl']:.2f} {metrics['quote_currency']}
- Unrealized P&L: {metrics['paper_unrealized_pnl']:.2f} {metrics['quote_currency']}
- Simulated Fees Paid: {metrics['paper_fees_paid']:.2f} {metrics['quote_currency']}
"""
        
        report = f"""
TradeTron Round 2 Executive Report
==================================

Mission Status:
- Running since: {self.start_time.strftime('%Y-%m-%d %H:%M:%S')}
- Uptime: {metrics['uptime']}
- Current Symbol: {self.symbol}
- Strategy Profile: {self.strategy_profile}
- Market Regime: {metrics['regime']}
- Recommended Action: {metrics['signal_action']}
- Signal Confidence: {metrics['signal_confidence']:.2f}
- Readiness Score: {metrics['readiness_score']:.2f}
- Readiness Status: {metrics['readiness_status']}
- Risk Posture: {metrics['risk_posture']}
- Open Positions: {len(self.open_positions)}
- Last Trade: {metrics['last_trade_label']}
- Next Scan: {metrics['next_scan_label']}

Signal Stack:
- Buy Score: {signal_snapshot.get('buy_score', 0):.2f}
- Sell Score: {signal_snapshot.get('sell_score', 0):.2f}
- Bias: {signal_snapshot.get('bias', 0):.2f}
- Would Buy At: {signal_snapshot.get('estimated_entry_price', 0):.2f}
- Buy Gate: {signal_snapshot.get('buy_gate_status', 'WAITING')}
- ATR %: {signal_snapshot.get('atr_percent', 0) * 100:.2f}%
- Volume Ratio: {signal_snapshot.get('volume_ratio', 0):.2f}
- Risk / Reward: {signal_snapshot.get('risk_reward', 0):.2f}
- Recommended Position Size: {signal_snapshot.get('recommended_size', 0):.6f}
- Buy Blockers: {' | '.join(signal_snapshot.get('buy_blockers', [])) or 'None'}

Performance:
- Total Trades: {stats['total_trades']}
- Win Trades: {stats['win_trades']}
- Loss Trades: {stats['loss_trades']}
- Win Rate: {stats['win_rate']*100:.2f}%
- Total Profit/Loss: {stats['total_profit_loss']*100:.2f}%
- Average Return per Closed Trade: {stats['average_return']*100:.2f}%
- Profit Factor: {stats['profit_factor']:.2f}
- Max Drawdown: {stats['max_drawdown']*100:.2f}%
- Current Win Streak: {stats['win_streak']}
- Current Loss Streak: {stats['loss_streak']}

Risk Envelope:
- Daily Loss Limit: {self.max_daily_loss*100:.2f}%
- Current Daily Loss: {self.daily_loss*100:.2f}%
- Max Concurrent Trades: {self.max_concurrent_trades}
- Market History Limit: {self.market_history_limit} candles
- Trade Cooldown: {self.trade_cooldown_minutes:.0f} minutes
- Max Hold Window: {self.max_hold_hours:.1f} hours
- Loss-Streak Pause: {self.pause_after_loss_streak} losses -> {self.loss_streak_cooldown_minutes:.0f} minutes
- Exposure: ${metrics['exposure_value']:.2f} ({metrics['exposure_ratio']*100:.2f}% of portfolio)
- Stop Distance: {signal_snapshot.get('stop_distance_pct', self.stop_loss)*100:.2f}%
- Take Profit Target: {self.take_profit*100:.2f}%
- Entry Cooldown Remaining: {metrics['cooldown_label']}
- Pause Remaining: {metrics['pause_label']}

Portfolio:
- Portfolio Value: ${metrics['portfolio_value']:.2f}
- Open Positions: {len(self.open_positions)}
{paper_section}

Preflight:
{chr(10).join(f"- [{'PASS' if check['passed'] else 'HOLD'}] {check['name']}: {check['detail']}" for check in preflight.get('checks', []))}

Desk Commentary:
- {' '.join(signal_snapshot.get('reasons', ['No active commentary available.']))}
- Risk Flags: {', '.join(signal_snapshot.get('risk_flags', [])) or 'None'}

"""
        return report

# Usage example
if __name__ == "__main__":
    # Live trading example:
    # bot = CryptoTradingBot('binance', 'your_api_key', 'your_api_secret')
    #
    # Full paper trading example with no API credentials:
    # config = merge_config_with_defaults({'enable_paper_trading': True, 'paper_balance': 10000.0})
    # save_bot_config_file('bot_config.json', config)
    # bot = CryptoTradingBot('binance', config_file='bot_config.json')
    # bot.run_trading_cycle()
    
    print("Crypto Trading Bot - Ready to deploy")
    print("To use:")
    print("1. Configure bot parameters in bot_config.json")
    print("2. For live mode, add your API keys")
    print("3. For paper mode, enable paper trading and launch with blank keys")
    print("4. Run bot.run_trading_cycle()")
    print("5. Launch the desktop dashboard with: python tradetron_ui.py")
