export function ObDateRangePicker() {
  'ngInject';

  let directive = {
    restrict: 'E',
    scope: {
      weekStart: '&',
      range: '=?',
      weekDaysName: '&',
      format: '&',
      ranges: '&',
      minDay: '&',
      maxDay: '&',
      monthFormat: '&',
      inputFormat: '&',
      onApply: '&',
      linkedCalendars: '&',
      autoApply: '&',
      disabled: '&',
      calendarsAlwaysOn: '&',
      api: '=?',
      canSelectYear: '=?'
    },
    controller: ObDateRangePickerController,
    templateUrl: 'app/directives/ob-date-range-picker/ob-date-range-picker.html',
    controllerAs: 'obDateRangePicker',
    bindToController: true,
    link: (scope, elem, attrs, ctrl) => {
      ctrl.init();
    }
  };

  return directive;
}

class ObDateRangePickerController {

  constructor($document, $element, $scope, moment, dateRangePickerConf) {
    'ngInject';

    this.Element = $element;
    this.Document = $document;
    this.Scope = $scope;
    this.Moment = moment;
    this.dateRangePickerConf = dateRangePickerConf;
    this.pickerApi = {};
  }

  init() {
    this.range = this.range || this.dateRangePickerConf.range || {};

    //config setup
    this.weekStart = this.weekStart() ? this.weekStart : () => {
      return this.dateRangePickerConf.weekStart
    };
    this.weekDaysName = this.weekDaysName() ? this.weekDaysName : () => {
      return this.dateRangePickerConf.weekDaysName
    };
    this.format = this.format() ? this.format : () => {
      return this.dateRangePickerConf.format
    };
    this.ranges = this.ranges() ? this.ranges : () => {
      return this.dateRangePickerConf.ranges
    };
    this.minDay = this.minDay() ? this.minDay : () => {
      return this.dateRangePickerConf.minDay
    };
    this.maxDay = this.maxDay() ? this.maxDay : () => {
      return this.dateRangePickerConf.maxDay
    };
    this.monthFormat = this.monthFormat() ? this.monthFormat : () => {
      return this.dateRangePickerConf.monthFormat
    };
    this.inputFormat = this.inputFormat() ? this.inputFormat : () => {
      return this.dateRangePickerConf.inputFormat
    };
    this.linkedCalendars = angular.isDefined(this.linkedCalendars()) ? this.linkedCalendars : () => {
      return this.dateRangePickerConf.linkedCalendars
    };
    this.autoApply = angular.isDefined(this.autoApply()) ? this.autoApply : () => {
      return this.dateRangePickerConf.autoApply
    };
    this.disabled = angular.isDefined(this.disabled()) ? this.disabled : () => {
      return this.dateRangePickerConf.disabled
    };
    this.calendarsAlwaysOn = angular.isDefined(this.calendarsAlwaysOn()) ? this.calendarsAlwaysOn : () => {
      return this.dateRangePickerConf.calendarsAlwaysOn
    };
    this.Scope.startTime = new Date();
    this.Scope.endTime = new Date();

    this.isCustomVisible = this.calendarsAlwaysOn();

    this.setOpenCloseLogic();
    this.setWatchers();
    this.value = 'Select a Range';

    this.api && Object.assign(this.api, {
      setDateRange: this.setDateRange.bind(this),
      togglePicker: this.togglePicker.bind(this),
      isPickerOpen: this.isPickerOpen.bind(this),
      render: () => {
        this.render();
        this.pickerApi.render();
      }
    });
    this.preRanges = this.ranges() || [];
    if (this.preRanges.length) {
      this.preRanges.push({
        name: 'Custom',
        isCustom: true
      });
    } else {
      this.isCustomVisible = true;
    }

    this.render();
    this.setListeners();
  }

  render() {
    this._range = {
      start: this.Moment(),
      end: this.Moment()
    };
    this.setPredefinedStatus();

    if (this.range.start &&
      this.range.end && !this.Moment.isMoment(this.range.start) && !this.Moment.isMoment(this.range.end) &&
      this.format()) {
      this._range = {
        start: this.Moment(this.range.start, this.getFormat()),
        end: this.Moment(this.range.end, this.getFormat())
      };
    } else if (this.Moment.isMoment(this.range.start) && this.Moment.isMoment(this.range.end)) {
      this._range = {
        start: this.range.start,
        end: this.range.end
      };

    } else if (this.preRanges.length > 1) {
      let firstPreRange = this.preRanges[0];
      this._range.start = firstPreRange.start;
      this._range.end = firstPreRange.end;

    } else if (this.range.start === null && this.range.end === null) {
      this._range = {
        start: null,
        end: null
      };
    }

    if (this.range.start !== null && this.range.end !== null) {
      if (this._range.start.isAfter(this._range.end)) {
        this._range.start = this._range.end.clone();
      } else if (this._range.end.isBefore(this._range.start)) {
        this._range.end = this._range.start.clone();
      }
    }

    this.applyMinMaxDaysToRange();
    this.setRange();
    this.markPredefined(this._range.start, this._range.end);
    this.setPickerInterceptors();
    this.isCustomVisible = this.calendarsAlwaysOn();
  }

  applyMinMaxDaysToRange() {
    if (this.minDay()) {
      let minDay = this._getMinDay();
      this._range.start = this._range.start.isBefore(minDay, 'd') ? minDay : this._range.start;
      this._range.end = this._range.end.isBefore(minDay, 'd') ? minDay : this._range.end;
    }

    if (this.maxDay()) {
      let maxDay = this._getMaxDay();
      this._range.start = this._range.start.isAfter(maxDay) ? maxDay : this._range.start;
      this._range.end = this._range.end.isAfter(maxDay) ? maxDay : this._range.end;
    }
  }

  setPickerInterceptors() {
    this.pickerInterceptors = {
      rangeSelectedByClick: () => {
        if (this.autoApply()) {
          this.applyChanges();
        }
      }
    }
  }

  setPredefinedStatus() {
    this.preRanges.forEach((range) => {
      if (!range.isCustom) {
        range.disabled = false;

        if (this.minDay()) {
          let minDay = this._getMinDay();
          range.disabled = range.start.isBefore(minDay, 'd');
        }

        if (!range.disabled && this.maxDay()) {
          let maxDay = this._getMaxDay();
          range.disabled = range.end.isAfter(maxDay, 'd');
        }
      }
    })
  }

  setWatchers() {
    this.Scope.$watchGroup([() => {
      return this._range.start;
    }, () => {
      return this._range.end;
    }], ([start, end]) => {
      if (!this.selfChange) {
        if (start && end) {
          if (this.preRanges.length) {
            this.preRanges[this.preRanges.length - 1].start = start;
            this.preRanges[this.preRanges.length - 1].end = end;
            this.markPredefined(start, end);
          }
          this.value = this.getRangeValue();
        }
      }

      this.selfChange = false;
    });

    this.Scope.$watchGroup(['startTime', 'endTime'], () => {
      if (this.Scope.startTime instanceof Date && this.Scope.endTime instanceof Date) {
        if (this._range.start && this._range.end) {
          this._range.start.hours(this.Scope.startTime.getHours())
            .minutes(this.Scope.startTime.getMinutes());
          this._range.end.hours(this.Scope.endTime.getHours())
            .minutes(this.Scope.endTime.getMinutes());
        }
        this.value = this.getRangeValue();
        this.updateTime();
      }
    });
  }

  setOpenCloseLogic() {
    this.isPickerVisible = false;
    this.pickerPopup = angular.element(this.Element[0].querySelector('.picker'));
    this.elemClickFlag = false;
  }

  setListeners() {
    let events = {
      documentClick: () => {
        if (this.elemClickFlag) {
          this.elemClickFlag = false;
        } else {
          this.isPickerVisible && this.discardChanges();
          this.Scope.$apply();
        }
      },
      documentEsc: (e) => {
        if (e.keyCode == 27 && this.isPickerVisible) {
          this.discardChanges();
          this.hidePicker();
          this.Scope.$apply();
        }
      },
      pickerClick: () => {
        this.elemClickFlag = true;
        this.Scope.$apply();
      }
    };

    this.pickerPopup.on('click', events.pickerClick.bind(this));
    this.Document.on('click', events.documentClick.bind(this));
    this.Document.on('keydown', events.documentEsc.bind(this));

    this.Scope.$on('$destroy', () => {
      this.pickerPopup.off('click', events.pickerClick);
      this.Document.off('click', events.documentClick);
      this.Document.off('keydown', events.documentClick);
    });
  }

  togglePicker() {
    let disabled = angular.isDefined(this.disabled()) ? this.disabled() : false;
    if (!disabled && !this.isPickerVisible) {
      this.isPickerVisible = true;
      this.elemClickFlag = true;
    } else {
      this.isPickerVisible = false;
    }
  }

  hidePicker() {
    this.isPickerVisible = false;
  }

  isPickerOpen() {
    return this.isPickerVisible;
  }

  updateTime(range = this._range) {
    this.range.start = range.start;
    this.range.end = range.end;
  }

  setRange(range = this._range) {
    if (this.format()) {
      this.range.start = range.start.format(this.getFormat());
      this.range.end = range.end.format(this.getFormat());
    } else {
      this.range.start = range.start;
      this.range.end = range.end;
    }
    this.Scope.startTime = new Date(this.range.start);
    this.Scope.startTime.setHours(0);
    this.Scope.startTime.setSeconds(0);
    this.Scope.startTime.setMilliseconds(0);
    this.Scope.endTime = new Date(this.range.end);
    this.Scope.endTime.setHours(23);
    this.Scope.endTime.setMinutes(59);
    this.Scope.endTime.setSeconds(0);
    this.Scope.endTime.setMilliseconds(0);
    //this.Scope.startTime = this.Scope.endTime = new Date(0, 0, 0, 0, 0);
  }

  predefinedRangeSelected(range, index) {
    if (!range.disabled) {
      if (!range.isCustom) {
        this.selfChange = true;
        this.selectedRengeIndex = index;
        this.value = range.name;
        this._range.start = range.start;
        this._range.end = range.end;
        this.isCustomVisible = this.calendarsAlwaysOn() || false;
        this.applyChanges();
      } else {
        this.isCustomVisible = true;
      }
    }
  }

  getFormat() {
    return this.format() || 'DD/MM/YYYY HH:mm';
  }

  discardChanges() {
    let format = this.getFormat();
    let start = this.range.start === null ? null : this.Moment(this.range.start, format);
    let end = this.range.end === null ? null : this.Moment(this.range.end, format);
    this._range.start = start;
    this._range.end = end;
    this.value = this.getRangeValue();
    this.pickerApi.setCalendarPosition(start, end);
    this.hidePicker();
  }

  markPredefined(start, end) {
    this.selectedRengeIndex = this.preRanges.findIndex((range) => {
      return (start.isSame(range.start, 'day') && end.isSame(range.end, 'day'));
    });
  }

  getRangeValue() {
    let value;
    let format = this.getInputFormat();
    if (this.preRanges.length) {
      let index = this.preRanges.findIndex((range) => {
        return (this._range.start.isSame(range.start, 'day') && this._range.end.isSame(range.end, 'day'));
      });

      if (index !== -1) {
        if (this.preRanges[index].isCustom) {
          value = `${this.preRanges[index].start.format(format)} - ${this.preRanges[index].end.format(format)}`;
        } else {
          value = this.preRanges[index].name;
        }
      }
    } else if ( this._range.start === null &&  this._range.end === null) {
      value = '';
    } else {
      value = `${this._range.start.format(format)} - ${this._range.end.format(format)}`;
    }

    return value;
  }

  applyChanges(callApply = true) {
    this.setRange();
    // this.hidePicker();
    this.pickerApi.setCalendarPosition && this.pickerApi.setCalendarPosition(this._range.start, this._range.end);
    if (callApply && this.onApply) {
      this.onApply({start: this._range.start, end: this._range.end});
    }
  }

  getInputFormat() {
    return this.inputFormat() || 'DD/MM/YYYY HH:mm';
  }

  setDateRange(range) {
    this._range.start = range.start;
    this._range.end = range.end;
    this.applyChanges(false);
  }

  _getMinDay() {
    return this.minDay() ? this.Moment(this.minDay(), this.getFormat()) : undefined;
  }

  _getMaxDay() {
    return this.maxDay() ? this.Moment(this.maxDay(), this.getFormat()) : undefined;
  }
}
