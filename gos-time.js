/* Garden OS current-time authority.
 * Active product surfaces read dates, ISO weeks, seasons, and week labels from
 * this one module so a stale mock date cannot become user advice.
 */
(function (global) {
  'use strict';

  function asDate(value) {
    var date = value instanceof Date ? new Date(value.getTime()) : new Date(value == null ? Date.now() : value);
    if (isNaN(date.getTime())) throw new Error('GosTime: invalid date');
    return date;
  }

  function isoWeek(dateValue) {
    var source = asDate(dateValue);
    var date = new Date(Date.UTC(source.getFullYear(), source.getMonth(), source.getDate()));
    var dayNum = date.getUTCDay() || 7;
    date.setUTCDate(date.getUTCDate() + 4 - dayNum);
    var yearStart = new Date(Date.UTC(date.getUTCFullYear(), 0, 1));
    return Math.ceil((((date - yearStart) / 86400000) + 1) / 7);
  }

  function isoWeekYear(dateValue) {
    var source = asDate(dateValue);
    var date = new Date(Date.UTC(source.getFullYear(), source.getMonth(), source.getDate()));
    var dayNum = date.getUTCDay() || 7;
    date.setUTCDate(date.getUTCDate() + 4 - dayNum);
    return date.getUTCFullYear();
  }

  function seasonForMonth(month) {
    if (month >= 2 && month <= 4) return { id: 'spring', label: 'Spring' };
    if (month >= 5 && month <= 7) return { id: 'summer', label: 'Summer' };
    if (month >= 8 && month <= 10) return { id: 'fall', label: 'Fall' };
    return { id: 'winter', label: 'Winter' };
  }

  function doctorSeasonForMonth(month) {
    if (month === 2 || month === 3) return 'early-spring';
    if (month === 4) return 'late-spring';
    if (month >= 5 && month <= 7) return 'summer';
    if (month >= 8 && month <= 10) return 'fall';
    return 'winter';
  }

  function weekRange(date) {
    var monday = asDate(date);
    var weekday = (monday.getDay() + 6) % 7;
    monday.setDate(monday.getDate() - weekday);
    var sunday = new Date(monday.getTime());
    sunday.setDate(monday.getDate() + 6);
    return {
      start: monday,
      end: sunday,
      label: monday.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
        + ' - ' + sunday.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
    };
  }

  function currentContext(dateValue) {
    var date = asDate(dateValue);
    var localYearStartUtc = Date.UTC(date.getFullYear(), 0, 1);
    var localDayUtc = Date.UTC(date.getFullYear(), date.getMonth(), date.getDate());
    var season = seasonForMonth(date.getMonth());
    var range = weekRange(date);
    return {
      date: date,
      isoDate: date.toISOString(),
      week: isoWeek(date),
      seasonYear: String(isoWeekYear(date)),
      dayOfYear: Math.floor((localDayUtc - localYearStartUtc) / 86400000) + 1,
      label: date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' }),
      weekday: date.toLocaleDateString('en-US', { weekday: 'long' }),
      monthDay: date.toLocaleDateString('en-US', { month: 'long', day: 'numeric' }),
      season: season.id,
      seasonLabel: season.label,
      doctorSeason: doctorSeasonForMonth(date.getMonth()),
      weekStart: range.start,
      weekEnd: range.end,
      weekRangeLabel: range.label,
    };
  }

  global.GosTime = {
    currentContext: currentContext,
    isoWeek: isoWeek,
    isoWeekYear: isoWeekYear,
  };
})(typeof window !== 'undefined' ? window : this);
