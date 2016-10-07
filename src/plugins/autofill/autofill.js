import moment from '../../../node_modules/moment/moment.js';

import {offset, outerHeight, outerWidth} from './../../helpers/dom/element';
import {eventManager as eventManagerObject} from './../../eventManager';
import {registerPlugin} from './../../plugins';
import {WalkontableCellCoords} from './../../3rdparty/walkontable/src/cell/coords';

export {Autofill};

const datePatternAry = ['YYYY/MM/DD', 'YYYY-MM-DD', 'HH:mm:ss', 'YYYY/MM/DD HH:mm:ss'];
const excelDateBeginning = moment('1900-01-01T00:00:00').add(-2, 'days')
const oneDaySeconds = moment.duration(1, 'days').asSeconds()

function getDeltas(start, end, data, direction, attr) {
  var
  // rows
    rlength = data.length,
  // cols
    clength = data ? data[0].length : 0,
    deltas = [],
    arr = [],
    diffRow, diffCol,
    startValue, endValue, endRow, colAttr, endCol, rowAttr,
    delta;

  diffRow = end.row - start.row;
  diffCol = end.col - start.col;

  if (['down', 'up'].indexOf(direction) !== -1) {
    for (var col = 0; col <= diffCol; col++) {
      endRow = rlength - 1;
      startValue = parseFloat(data[0][col], 10);
      endValue = parseFloat(data[endRow][col], 10);
      colAttr = attr[0][col].dataAttrs;
      delta = genDelta(startValue, endValue, endRow, colAttr, direction, rlength);

      arr.push(delta);
    }
    deltas.push(arr);
  }

  if (['right', 'left'].indexOf(direction) !== -1) {
    for (var row = 0; row <= diffRow; row++) {
      endCol = clength - 1;
      startValue = parseFloat(data[row][0], 10);
      endValue = parseFloat(data[row][endCol], 10);
      rowAttr = attr[row][0].dataAttrs;
      delta = genDelta(startValue, endValue, endCol, rowAttr, direction, clength);

      arr = [];
      arr.push(delta);

      deltas.push(arr);
    }
  }

  return deltas;

}

function genDelta(startValue, endValue, endPos, attr, direction, totalLen) {
  var isAdd = ['down', 'right'].indexOf(direction) > -1,
    isDate = attr && attr.format && datePatternAry.indexOf(attr.format) > -1,
    delta;

  if (!isAdd) [startValue, endValue] = [endValue, startValue];
  if (endPos === 0 && isDate) {
    if (attr.format === 'HH:mm:ss') {
      delta = isAdd ? 1/24 : -1/24;
    } else {
      delta = isAdd ? 1 : -1;
    }
  } else if (isDate) {
    delta = genDeltaDate(
      numberToMoment(startValue),
      numberToMoment(endValue),
      totalLen - 1
    );
  } else {
    delta = (endValue - startValue) / (totalLen - 1) || 0;
  }

  return delta;
}

function genDeltaDate(startMoment, endMoment, len) {
  const diffMonths = endMoment.diff(startMoment, 'months', true)
  const months = diffMonths / len
  return Number.isInteger(months)
    ? {months}
    : endMoment.diff(startMoment, 'seconds', true) / oneDaySeconds / len
}

function numberToMoment(number) {
  return excelDateBeginning.clone().add(
    number * oneDaySeconds,
    'seconds'
  )
}

//解析需要autofill的值和属性
function filterRawData(data, selRange, tableInst){
  var destData = [], attrData = [], item, destItem,
  baseRow = Math.min(selRange.from.row, selRange.to.row),
  baseCol = Math.min(selRange.from.col, selRange.to.col);

  for(var row=0,l=data.length; row<l; row++){
    destData[row] = [];
    attrData[row] = [];
    for(var col=0,len=data[row].length; col<len; col++){
      destData[row].push(data[row][col]);
      attrData[row].push(tableInst.getCellMeta(baseRow + row, baseCol + col));
    }
  }
  return {
    value: destData,
    attr: attrData
  };
}

/**
 * This plugin provides "drag-down" and "copy-down" functionalities, both operated
 * using the small square in the right bottom of the cell selection.
 *
 * "Drag-down" expands the value of the selected cells to the neighbouring
 * cells when you drag the small square in the corner.
 *
 * "Copy-down" copies the value of the selection to all empty cells
 * below when you double click the small square.
 *
 * @class Autofill
 * @plugin Autofill
 */
function Autofill(instance) {
  var
    _this = this,
    mouseDownOnCellCorner = false,
    wtOnCellCornerMouseDown,
    wtOnCellMouseOver,
    eventManager;

  this.instance = instance;
  this.addingStarted = false;

  eventManager = eventManagerObject(instance);

  function mouseUpCallback(event) {
    if (!instance.autofill) {
      return true;
    }

    if (instance.autofill.handle && instance.autofill.handle.isDragged) {
      if (instance.autofill.handle.isDragged > 1) {
        instance.autofill.apply();
      }
      instance.autofill.handle.isDragged = 0;
      mouseDownOnCellCorner = false;
    }
  }

  function mouseMoveCallback(event) {
    var tableBottom, tableRight;

    if (!_this.instance.autofill) {
      return false;
    }
    tableBottom = offset(_this.instance.table).top - (window.pageYOffset ||
      document.documentElement.scrollTop) + outerHeight(_this.instance.table);
    tableRight = offset(_this.instance.table).left - (window.pageXOffset ||
      document.documentElement.scrollLeft) + outerWidth(_this.instance.table);

    // dragged outside bottom
    if (_this.addingStarted === false && _this.instance.autofill.handle.isDragged > 0 && event.clientY > tableBottom &&
      event.clientX <= tableRight) {
      _this.instance.mouseDragOutside = true;
      _this.addingStarted = true;

    } else {
      _this.instance.mouseDragOutside = false;
    }

    if (_this.instance.mouseDragOutside) {
      setTimeout(function() {
        _this.addingStarted = false;
        _this.instance.runHooks('beforeAutoCreateRow', _this.instance.countRows(), 1, 'mouseDragOutside');
        _this.instance.alter('insert_row');
      }, 200);
    }
  }

  eventManager.addEventListener(document, 'mouseup', mouseUpCallback);
  eventManager.addEventListener(document, 'mousemove', mouseMoveCallback);

  // Appeding autofill-specific methods to walkontable event settings
  wtOnCellCornerMouseDown = this.instance.view.wt.wtSettings.settings.onCellCornerMouseDown;

  this.instance.view.wt.wtSettings.settings.onCellCornerMouseDown = function(event) {
    instance.autofill.handle.isDragged = 1;
    mouseDownOnCellCorner = true;
    wtOnCellCornerMouseDown(event);
  };

  wtOnCellMouseOver = this.instance.view.wt.wtSettings.settings.onCellMouseOver;

  this.instance.view.wt.wtSettings.settings.onCellMouseOver = function(event, coords, TD, wt) {
    if (instance.autofill && mouseDownOnCellCorner && !instance.view.isMouseDown() &&
      instance.autofill.handle && instance.autofill.handle.isDragged) {
      instance.autofill.handle.isDragged++;
      instance.autofill.showBorder(coords);
      instance.autofill.checkIfNewRowNeeded();
    }
    wtOnCellMouseOver(event, coords, TD, wt);
  };

  this.instance.view.wt.wtSettings.settings.onCellCornerDblClick = function() {
    instance.autofill.selectAdjacent();
  };
}

/**
 * Create fill handle and fill border objects
 *
 * @function init
 * @memberof Autofill#
 */
Autofill.prototype.init = function() {
  this.handle = {};
};

/**
 * Hide fill handle and fill border permanently
 *
 * @function disable
 * @memberof Autofill#
 */
Autofill.prototype.disable = function() {
  this.handle.disabled = true;
};

/**
 * Selects cells down to the last row in the left column, then fills down to that cell
 *
 * @function selectAdjacent
 * @memberof Autofill#
 */
Autofill.prototype.selectAdjacent = function() {
  var select, data, r, maxR, c;

  if (this.instance.selection.isMultiple()) {
    select = this.instance.view.wt.selections.area.getCorners();

  } else {
    select = this.instance.view.wt.selections.current.getCorners();
  }
  data = this.instance.getData();

  rows: for (r = select[2] + 1; r < this.instance.countRows(); r++) {
    for (c = select[1]; c <= select[3]; c++) {
      if (data[r][c]) {
        break rows;
      }
    }
    if (!!data[r][select[1] - 1] || !!data[r][select[3] + 1]) {
      maxR = r;
    }
  }
  if (maxR) {
    this.instance.view.wt.selections.fill.clear();
    this.instance.view.wt.selections.fill.add(new WalkontableCellCoords(select[0], select[1]));
    this.instance.view.wt.selections.fill.add(new WalkontableCellCoords(maxR, select[3]));
    this.apply();
  }
};

/**
 * Apply fill values to the area in fill border, omitting the selection border
 *
 * @function apply
 * @memberof Autofill#
 */
Autofill.prototype.apply = function() {
  var drag, select, start, end, _data, direction, deltas, selRange;

  this.handle.isDragged = 0;

  if (this.instance.view.wt.selections.fill.isEmpty()) {
    return;
  }
  drag = this.instance.view.wt.selections.fill.getCorners();
  this.instance.view.wt.selections.fill.clear();

  if (this.instance.selection.isMultiple()) {
    select = this.instance.view.wt.selections.area.getCorners();
  } else {
    select = this.instance.view.wt.selections.current.getCorners();
  }
  Handsontable.hooks.run(this.instance, 'afterAutofillApplyValues', select, drag);

  if (drag[0] === select[0] && drag[1] < select[1]) {
    direction = 'left';

    start = new WalkontableCellCoords(drag[0], drag[1]);
    end = new WalkontableCellCoords(drag[2], select[1] - 1);

  } else if (drag[0] === select[0] && drag[3] > select[3]) {
    direction = 'right';

    start = new WalkontableCellCoords(drag[0], select[3] + 1);
    end = new WalkontableCellCoords(drag[2], drag[3]);

  } else if (drag[0] < select[0] && drag[1] === select[1]) {
    direction = 'up';

    start = new WalkontableCellCoords(drag[0], drag[1]);
    end = new WalkontableCellCoords(select[0] - 1, drag[3]);

  } else if (drag[2] > select[2] && drag[1] === select[1]) {
    direction = 'down';

    start = new WalkontableCellCoords(select[2] + 1, drag[1]);
    end = new WalkontableCellCoords(drag[2], drag[3]);
  }

  if (start && start.row > -1 && start.col > -1) {
    selRange = {
      from: this.instance.getSelectedRange().from,
      to: this.instance.getSelectedRange().to,
    };
    _data = this.instance.getData(selRange.from.row, selRange.from.col, selRange.to.row, selRange.to.col);
    _data = filterRawData(_data, selRange, this.instance);
    deltas = getDeltas(start, end, _data.value, direction, _data.attr);

    Handsontable.hooks.run(this.instance, 'beforeAutofill', start, end, _data.value);
    this.instance.populateFromArray(start.row, start.col, _data.value, end.row, end.col, 'autofill', null, direction, deltas, _data.attr);

    this.instance.selection.setRangeStart(new WalkontableCellCoords(drag[0], drag[1]));
    this.instance.selection.setRangeEnd(new WalkontableCellCoords(drag[2], drag[3]));

  } else {
    // reset to avoid some range bug
    this.instance.selection.refreshBorders();
  }
};

/**
 * Show fill border
 *
 * @function showBorder
 * @memberof Autofill#
 * @param {WalkontableCellCoords} coords
 */
Autofill.prototype.showBorder = function(coords) {
  var topLeft = this.instance.getSelectedRange().getTopLeftCorner(),
    bottomRight = this.instance.getSelectedRange().getBottomRightCorner();

  if (this.instance.getSettings().fillHandle !== 'horizontal' && (bottomRight.row < coords.row || topLeft.row > coords.row)) {
    coords = new WalkontableCellCoords(coords.row, bottomRight.col);

  } else if (this.instance.getSettings().fillHandle !== 'vertical') { // jscs:ignore disallowNotOperatorsInConditionals
    coords = new WalkontableCellCoords(bottomRight.row, coords.col);

  } else {
    // wrong direction
    return;
  }
  this.instance.view.wt.selections.fill.clear();
  this.instance.view.wt.selections.fill.add(this.instance.getSelectedRange().from);
  this.instance.view.wt.selections.fill.add(this.instance.getSelectedRange().to);
  this.instance.view.wt.selections.fill.add(coords);
  this.instance.view.render();
};

/**
 * Adds new rows if they are needed to continue auto-filling values
 * @function checkIfNewRowNeeded
 * @memberof Autofill#
 */
Autofill.prototype.checkIfNewRowNeeded = function() {
  var fillCorners,
    selection,
    tableRows = this.instance.countRows(),
    that = this;

  if (this.instance.view.wt.selections.fill.cellRange && this.addingStarted === false) {
    selection = this.instance.getSelected();
    fillCorners = this.instance.view.wt.selections.fill.getCorners();

    if (selection[2] < tableRows - 1 && fillCorners[2] === tableRows - 1) {
      this.addingStarted = true;

      this.instance._registerTimeout(setTimeout(function() {
        that.instance.runHooks('beforeAutoCreateRow', that.instance.countRows(), 1, 'checkIfNewRowNeeded');
        that.instance.alter('insert_row');
        that.addingStarted = false;
      }, 200));
    }
  }
};

Handsontable.hooks.add('afterInit', function() {
  var autofill = new Autofill(this);

  if (typeof this.getSettings().fillHandle !== 'undefined') {
    if (autofill.handle && this.getSettings().fillHandle === false) {
      autofill.disable();

    } else if (!autofill.handle && this.getSettings().fillHandle !== false) {
      /**
       * Instance of Autofill Plugin {@link Handsontable.Autofill}
       *
       * @alias autofill
       * @memberof! Handsontable.Core#
       * @type {Autofill}
       */
      this.autofill = autofill;
      this.autofill.init();
    }
  }
});

Handsontable.Autofill = Autofill;
