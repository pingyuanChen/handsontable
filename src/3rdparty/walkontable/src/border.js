import {
    getComputedStyle,
    getTrimmingContainer,
    innerWidth,
    innerHeight,
    offset,
    outerHeight,
    outerWidth,
} from './../../../helpers/dom/element';
import {stopImmediatePropagation} from './../../../helpers/dom/event';
import {EventManager} from './../../../eventManager';
import {WalkontableCellCoords} from './cell/coords';
import {WalkontableOverlay} from './overlay/_base.js';

/**
 *
 */
class WalkontableBorder {
  /**
   * @param {Walkontable} wotInstance
   * @param {Object} settings
   */
  constructor(wotInstance, settings) {
    if (!settings) {
      return;
    }
    this.eventManager = new EventManager(wotInstance);
    this.instance = wotInstance;
    this.wot = wotInstance;
    this.settings = settings;
    this.mouseDown = false;
    this.main = null;

    this.top = null;
    this.left = null;
    this.bottom = null;
    this.right = null;

    this.topStyle = null;
    this.leftStyle = null;
    this.bottomStyle = null;
    this.rightStyle = null;

    this.cornerDefaultStyle = {
      width: '5px',
      height: '5px',
      borderWidth: '2px',
      borderStyle: 'solid',
      borderColor: '#FFF'
    };
    this.corner = null;
    this.cornerStyle = null;

    this.createBorders(settings);
    this.registerListeners();
  }

  /**
   * Register all necessary events
   */
  registerListeners() {
    this.eventManager.addEventListener(document.body, 'mousedown', () => this.onMouseDown());
    this.eventManager.addEventListener(document.body, 'mouseup', () => this.onMouseUp());

    for (let c = 0, len = this.main.childNodes.length; c < len; c++) {
      this.eventManager.addEventListener(this.main.childNodes[c], 'mouseenter', (event) => this.onMouseEnter(event));
    }
  }

  /**
   * Mouse down listener
   *
   * @private
   */
  onMouseDown() {
    this.mouseDown = true;
  }

  /**
   * Mouse up listener
   *
   * @private
   */
  onMouseUp() {
    this.mouseDown = false;
  }

  /**
   * Mouse enter listener
   *
   * @private
   * @param {Event} event Dom event
   */
  onMouseEnter(event) {
    if (!this.mouseDown || !this.wot.getSetting('hideBorderOnMouseDownOver')) {
      return;
    }
    event.preventDefault();
    stopImmediatePropagation(event);

    let _this = this;
    let bounds = this.getBoundingClientRect();
    this.style.display = 'none';

    function isOutside(event) {
      if (event.clientY < Math.floor(bounds.top)) {
        return true;
      }
      if (event.clientY > Math.ceil(bounds.top + bounds.height)) {
        return true;
      }
      if (event.clientX < Math.floor(bounds.left)) {
        return true;
      }
      if (event.clientX > Math.ceil(bounds.left + bounds.width)) {
        return true;
      }
    }

    function handler(event) {
      if (isOutside(event)) {
        _this.eventManager.removeEventListener(document.body, 'mousemove', handler);
        _this.style.display = 'block';
      }
    }

    this.eventManager.addEventListener(document.body, 'mousemove', handler);
  }

  /**
   * Create border elements
   *
   * @param {Object} settings
   */
  createBorders(settings) {
    this.main = document.createElement('div');

    let borderDivs = ['top', 'left', 'bottom', 'right', 'corner', 'background'];
    let style = this.main.style;
    let _customBorderStyle = settings.customBorderStyle;
    style.position = 'absolute';
    style.top = 0;
    style.left = 0;

    for (let i = 0; i < 6; i++) {
      let position = borderDivs[i];
      let div = document.createElement('div');
      div.className = 'wtBorder ' + (this.settings.className || ''); // + borderDivs[i];

      if (this.settings[position] && this.settings[position].hide) {
        div.className += ' hidden';
      }
      if (position === 'background') {
        div.className += ' selection-background';
      }
      style = div.style;
      style.height = (this.settings[position] && this.settings[position].width) ? this.settings[position].width + 'px' : settings.border.width + 'px';
      style.width = (this.settings[position] && this.settings[position].width) ? this.settings[position].width + 'px' : settings.border.width + 'px';
      if(_customBorderStyle){
        style.borderStyle = _customBorderStyle.style;
        style.borderColor = _customBorderStyle.color;
        if(['top', 'bottom'].indexOf(position) >= 0){
          style.height = 0;
          style.borderTopWidth = _customBorderStyle.width + 'px';
        }else if(['left', 'right'].indexOf(position) >= 0){
          style.width = 0;
          style.borderLeftWidth = _customBorderStyle.width + 'px';
        }
      }else{
        style.backgroundColor = (this.settings[position] && this.settings[position].color) ? this.settings[position].color : settings.border.color;
      }
      this.main.appendChild(div);
    }
    this.top = this.main.childNodes[0];
    this.left = this.main.childNodes[1];
    this.bottom = this.main.childNodes[2];
    this.right = this.main.childNodes[3];
    this.background = this.main.childNodes[5];

    this.topStyle = this.top.style;
    this.leftStyle = this.left.style;
    this.bottomStyle = this.bottom.style;
    this.rightStyle = this.right.style;
    this.backStyle = this.background.style;

    this.corner = this.main.childNodes[4];
    this.corner.className += ' corner';
    this.cornerStyle = this.corner.style;
    this.cornerStyle.width = this.cornerDefaultStyle.width;
    this.cornerStyle.height = this.cornerDefaultStyle.height;
    this.cornerStyle.border = [
      this.cornerDefaultStyle.borderWidth,
      this.cornerDefaultStyle.borderStyle,
      this.cornerDefaultStyle.borderColor
    ].join(' ');

    if (Handsontable.mobileBrowser) {
      // hide selectionHandles in mobile 2016mobile#4
      // this.createMultipleSelectorHandles();
    }
    this.disappear();

    if (!this.wot.wtTable.bordersHolder) {
      this.wot.wtTable.bordersHolder = document.createElement('div');
      this.wot.wtTable.bordersHolder.className = 'htBorders';
      this.wot.wtTable.spreader.appendChild(this.wot.wtTable.bordersHolder);
    }
    this.wot.wtTable.bordersHolder.insertBefore(this.main, this.wot.wtTable.bordersHolder.firstChild);
  }

  /**
   * Create multiple selector handler for mobile devices
   */
  createMultipleSelectorHandles() {
    this.selectionHandles = {
      topLeft: document.createElement('DIV'),
      topLeftHitArea: document.createElement('DIV'),
      bottomRight: document.createElement('DIV'),
      bottomRightHitArea: document.createElement('DIV')
    };
    let width = 10;
    let hitAreaWidth = 40;

    this.selectionHandles.topLeft.className = 'topLeftSelectionHandle';
    this.selectionHandles.topLeftHitArea.className = 'topLeftSelectionHandle-HitArea';
    this.selectionHandles.bottomRight.className = 'bottomRightSelectionHandle';
    this.selectionHandles.bottomRightHitArea.className = 'bottomRightSelectionHandle-HitArea';

    this.selectionHandles.styles = {
      topLeft: this.selectionHandles.topLeft.style,
      topLeftHitArea: this.selectionHandles.topLeftHitArea.style,
      bottomRight: this.selectionHandles.bottomRight.style,
      bottomRightHitArea: this.selectionHandles.bottomRightHitArea.style
    };

    let hitAreaStyle = {
      position: 'absolute',
      height: hitAreaWidth + 'px',
      width: hitAreaWidth + 'px',
      'border-radius': parseInt(hitAreaWidth / 1.5, 10) + 'px',
    };

    for (let prop in hitAreaStyle) {
      if (hitAreaStyle.hasOwnProperty(prop)) {
        this.selectionHandles.styles.bottomRightHitArea[prop] = hitAreaStyle[prop];
        this.selectionHandles.styles.topLeftHitArea[prop] = hitAreaStyle[prop];
      }
    }

    let handleStyle = {
      position: 'absolute',
      height: width + 'px',
      width: width + 'px',
      'border-radius': parseInt(width / 1.5, 10) + 'px',
      background: '#F5F5FF',
      border: '1px solid #4285c8'
    };

    for (let prop in handleStyle) {
      if (handleStyle.hasOwnProperty(prop)) {
        this.selectionHandles.styles.bottomRight[prop] = handleStyle[prop];
        this.selectionHandles.styles.topLeft[prop] = handleStyle[prop];
      }
    }
    this.main.appendChild(this.selectionHandles.topLeft);
    this.main.appendChild(this.selectionHandles.bottomRight);
    this.main.appendChild(this.selectionHandles.topLeftHitArea);
    this.main.appendChild(this.selectionHandles.bottomRightHitArea);
  }

  isPartRange(row, col) {
    if (this.wot.selections.area.cellRange) {
      if (row != this.wot.selections.area.cellRange.to.row || col != this.wot.selections.area.cellRange.to.col) {
        return true;
      }
    }

    return false;
  }

  updateMultipleSelectionHandlesPosition(row, col, top, left, width, height) {
    let handleWidth = parseInt(this.selectionHandles.styles.topLeft.width, 10);
    let hitAreaWidth = parseInt(this.selectionHandles.styles.topLeftHitArea.width, 10);

    this.selectionHandles.styles.topLeft.top = parseInt(top - handleWidth, 10) + 'px';
    this.selectionHandles.styles.topLeft.left = parseInt(left - handleWidth, 10) + 'px';

    this.selectionHandles.styles.topLeftHitArea.top = parseInt(top - (hitAreaWidth / 4) * 3, 10) + 'px';
    this.selectionHandles.styles.topLeftHitArea.left = parseInt(left - (hitAreaWidth / 4) * 3, 10) + 'px';

    this.selectionHandles.styles.bottomRight.top = parseInt(top + height, 10) + 'px';
    this.selectionHandles.styles.bottomRight.left = parseInt(left + width, 10) + 'px';

    this.selectionHandles.styles.bottomRightHitArea.top = parseInt(top + height - hitAreaWidth / 4, 10) + 'px';
    this.selectionHandles.styles.bottomRightHitArea.left = parseInt(left + width - hitAreaWidth / 4, 10) + 'px';

    if (this.settings.border.multipleSelectionHandlesVisible && this.settings.border.multipleSelectionHandlesVisible()) {
      this.selectionHandles.styles.topLeft.display = 'block';
      this.selectionHandles.styles.topLeftHitArea.display = 'block';

      if (this.isPartRange(row, col)) {
        this.selectionHandles.styles.bottomRight.display = 'none';
        this.selectionHandles.styles.bottomRightHitArea.display = 'none';
      } else {
        this.selectionHandles.styles.bottomRight.display = 'block';
        this.selectionHandles.styles.bottomRightHitArea.display = 'block';
      }
    } else {
      this.selectionHandles.styles.topLeft.display = 'none';
      this.selectionHandles.styles.bottomRight.display = 'none';
      this.selectionHandles.styles.topLeftHitArea.display = 'none';
      this.selectionHandles.styles.bottomRightHitArea.display = 'none';
    }

    if (row == this.wot.wtSettings.getSetting('fixedRowsTop') || col == this.wot.wtSettings.getSetting('fixedColumnsLeft')) {
      this.selectionHandles.styles.topLeft.zIndex = '9999';
      this.selectionHandles.styles.topLeftHitArea.zIndex = '9999';
    } else {
      this.selectionHandles.styles.topLeft.zIndex = '';
      this.selectionHandles.styles.topLeftHitArea.zIndex = '';
    }
  }

  /**
   * Show border around one or many cells
   *
   * @param {Array} corners
   */
  appear(corners) {
    if (this.disabled) {
      return;
    }
    var isMultiple,
        fromTD,
        toTD,
        fromOffset,
        toOffset,
        containerOffset,
        top,
        minTop,
        left,
        minLeft,
        height,
        width,
        fromRow,
        fromColumn,
        toRow,
        toColumn,
        trimmingContainer,
        cornerOverlappingContainer,
        ilen,
        displayedRows;

    displayedRows = this.wot.wtTable.wtRenderer.displayedRows;

    if (WalkontableOverlay.isOverlayTypeOf(this.wot.cloneOverlay, WalkontableOverlay.CLONE_TOP) ||
        WalkontableOverlay.isOverlayTypeOf(this.wot.cloneOverlay, WalkontableOverlay.CLONE_TOP_LEFT_CORNER)) {
      ilen = this.wot.getSetting('fixedRowsTop');
    } else if (WalkontableOverlay.isOverlayTypeOf(this.wot.cloneOverlay, WalkontableOverlay.CLONE_BOTTOM) ||
        WalkontableOverlay.isOverlayTypeOf(this.wot.cloneOverlay, WalkontableOverlay.CLONE_BOTTOM_LEFT_CORNER)) {
      ilen = this.wot.getSetting('fixedRowsBottom');
    } else {
      ilen = this.wot.wtTable.getRenderedRowsCount();
    }

    for (let i = 0; i < ilen; i++) {
      let s = this.wot.wtTable.rowFilter.renderedToSource(i);

      if (s >= corners[0] && s <= corners[2]) {
        fromRow = s;
        break;
      }
    }

    for (let i = ilen - 1; i >= 0; i--) {
      let s = this.wot.wtTable.rowFilter.renderedToSource(i);

      if (s >= corners[0] && s <= corners[2]) {
        toRow = s;
        break;
      }
    }

    ilen = this.wot.wtTable.getRenderedColumnsCount();

    for (let i = 0; i < ilen; i++) {
      let s = this.wot.wtTable.columnFilter.renderedToSource(i);

      if (s >= corners[1] && s <= corners[3]) {
        fromColumn = s;
        break;
      }
    }

    for (let i = ilen - 1; i >= 0; i--) {
      let s = this.wot.wtTable.columnFilter.renderedToSource(i);

      if (s >= corners[1] && s <= corners[3]) {
        toColumn = s;
        break;
      }
    }
    if (fromRow === void 0 || fromColumn === void 0) {
      this.disappear();

      return;
    }
    isMultiple = (fromRow !== toRow || fromColumn !== toColumn);
    fromTD = this.wot.wtTable.getCell(new WalkontableCellCoords(fromRow, fromColumn));
    if (corners[0] === 0 && toRow >= displayedRows.length) {
      toRow = displayedRows[displayedRows.length - 1];
    }
    toTD = isMultiple ? this.wot.wtTable.getCell(new WalkontableCellCoords(toRow, toColumn)) : fromTD;
    fromOffset = offset(fromTD);
    var borderOffset = $.extend({}, fromOffset);
    var isFormula = ($(toTD).attr('class') || '').indexOf('formula-selected') > -1;
    var formulaOffset = {
      left: 0,
      top: 0
    };

    if (isMultiple) {
      if (fromRow === 0) {
        var columnHeader = this.wot.wtTable.getColumnHeader(fromColumn)
        borderOffset.left = offset(columnHeader).left - 1;
        borderOffset.top = offset(columnHeader).top + $(columnHeader).outerHeight();
      } else if (fromColumn === 0) {
        var rowHeader = this.wot.wtTable.getRowHeader(fromRow);
        borderOffset.left = offset(rowHeader).left + $(rowHeader).outerWidth();
        borderOffset.top = offset(rowHeader).top;
      }
    }
    
    var backOffset = {
      left: borderOffset.left - fromOffset.left,
      top: borderOffset.top - fromOffset.top
    }
    if (backOffset.left < 5) {
      backOffset.left = 0;
    }
    if (isFormula) {
      formulaOffset = backOffset;
    }

    toOffset = isMultiple ? offset(toTD) : fromOffset;
    containerOffset = offset(this.wot.wtTable.TABLE);

    minTop = fromOffset.top;
    height = toOffset.top + outerHeight(toTD) - minTop;
    minLeft = fromOffset.left;
    width = toOffset.left + outerWidth(toTD) - minLeft;

    top = minTop - containerOffset.top - 1;
    left = minLeft - containerOffset.left - 1;
    let style = getComputedStyle(fromTD);

    if (parseInt(style.borderTopWidth, 10) > 0) {
      top += 1;
      height = height > 0 ? height - 1 : 0;
    }
    if (parseInt(style.borderLeftWidth, 10) > 0) {
      left += 1;
      width = width > 0 ? width - 1 : 0;
    }

    this.topStyle.top = top + backOffset.top + 'px';
    this.topStyle.left = left + formulaOffset.left + 'px';
    this.topStyle.width = width - formulaOffset.left + 'px';
    this.topStyle.display = 'block';

    this.leftStyle.top = top + formulaOffset.top + 'px';
    this.leftStyle.left = left + backOffset.left + 'px';
    this.leftStyle.height = height - formulaOffset.top + 'px';
    this.leftStyle.display = 'block';

    let delta = Math.floor(this.settings.border.width / 2);

    this.bottomStyle.top = top + height - delta + 'px';
    this.bottomStyle.left = left + 'px';
    this.bottomStyle.width = width + 'px';
    this.bottomStyle.display = 'block';

    this.rightStyle.top = top + 'px';
    this.rightStyle.left = left + width - delta + 'px';
    this.rightStyle.height = height + 1 + 'px';
    this.rightStyle.display = 'block';

    this.backStyle.top = top + backOffset.top + delta + 'px';
    this.backStyle.left = left + backOffset.left + delta + 'px';
    this.backStyle.width = width - backOffset.left - delta + 'px';
    this.backStyle.height = height - backOffset.top - delta + 'px';
    this.backStyle.background = 'rgba(115, 165, 225, .1)';
    
    if (isMultiple && !isFormula) {
      this.backStyle.display = 'block';
    } else {
      this.backStyle.display = 'none';
    }

    if (Handsontable.mobileBrowser || (!this.hasSetting(this.settings.border.cornerVisible) || this.isPartRange(toRow, toColumn))) {
      
      // hide selectionHandles in mobile 2016mobile#5
      if(!Handsontable.mobileBrowser) {
        this.cornerStyle.display = 'none';
      }
    } else {
      this.cornerStyle.top = top + height - 4 + 'px';
      this.cornerStyle.left = left + width - 4 + 'px';
      this.cornerStyle.borderRightWidth = this.cornerDefaultStyle.borderWidth;
      this.cornerStyle.width = this.cornerDefaultStyle.width;
      this.cornerStyle.display = 'block';

      trimmingContainer = getTrimmingContainer(this.wot.wtTable.TABLE);

      if (toColumn === this.wot.getSetting('totalColumns') - 1) {
        cornerOverlappingContainer = toTD.offsetLeft + outerWidth(toTD) >= innerWidth(trimmingContainer);

        if (cornerOverlappingContainer) {
          this.cornerStyle.left = Math.floor(left + width - 3 - parseInt(this.cornerDefaultStyle.width) / 2) + 'px';
          this.cornerStyle.borderRightWidth = 0;
        }
      }

      if (toRow === this.wot.getSetting('totalRows') - 1) {
        cornerOverlappingContainer = toTD.offsetTop + outerHeight(toTD) >= innerHeight(trimmingContainer);

        if (cornerOverlappingContainer) {
          this.cornerStyle.top = Math.floor(top + height - 3 - parseInt(this.cornerDefaultStyle.height) / 2) + 'px';
          this.cornerStyle.borderBottomWidth = 0;
        }
      }

    }

    if (Handsontable.mobileBrowser) {
      // hide selectionHandles in mobile 2016mobile#7
      // this.updateMultipleSelectionHandlesPosition(fromRow, fromColumn, top, left, width, height);
    }
  }

  /**
   * Hide border
   */
  disappear() {
    this.topStyle.display = 'none';
    this.leftStyle.display = 'none';
    this.bottomStyle.display = 'none';
    this.rightStyle.display = 'none';
    this.cornerStyle.display = 'none';
    this.backStyle.display = 'none';

    if (Handsontable.mobileBrowser) {
      // hide selectionHandles in mobile 2016mobile#6
      // this.selectionHandles.styles.topLeft.display = 'none';
      // this.selectionHandles.styles.bottomRight.display = 'none';
    }
  }

  /**
   * @param {Function} setting
   * @returns {*}
   */
  hasSetting(setting) {
    if (typeof setting === 'function') {
      return setting();
    }

    return !!setting;
  }
}

export {WalkontableBorder};

window.WalkontableBorder = WalkontableBorder;
