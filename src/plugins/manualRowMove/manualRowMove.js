
import {addClass, hasClass, removeClass} from './../../helpers/dom/element';
import {eventManager as eventManagerObject} from './../../eventManager';
import {pageX, pageY} from './../../helpers/dom/event';
import {registerPlugin} from './../../plugins';

export {ManualRowMove};

/**
 * HandsontableManualRowMove
 *
 * Has 2 UI components:
 * - handle - the draggable element that sets the desired position of the row
 * - guide - the helper guide that shows the desired position as a horizontal guide
 *
 * Warning! Whenever you make a change in this file, make an analogous change in manualRowMove.js
 *
 * @private
 * @class ManualRowMove
 * @plugin ManualRowMove
 */
function ManualRowMove() {

  var startRow,
    endRow,
    startY,
    startOffset,
    currentRow,
    currentTH,
    handle = document.createElement('DIV'),
    guide = document.createElement('DIV'),
    border = document.createElement('DIV'),
    eventManager = eventManagerObject(this);

  handle.className = 'manualRowMover';
  guide.className = 'manualRowMoverGuide';
  border.className = 'manualRowMoverBorder';

  var saveManualRowPositions = function() {
    var instance = this;
    Handsontable.hooks.run(instance, 'persistentStateSave', 'manualRowPositions', instance.manualRowPositions);
  };

  var loadManualRowPositions = function() {
    var instance = this,
      storedState = {};
    Handsontable.hooks.run(instance, 'persistentStateLoad', 'manualRowPositions', storedState);
    instance.addHook('selectedHeaderChange', function (rowSelected, colSelected) {
      if (rowSelected) {
        setTimeout(function() {
          showHandle(instance);
        }, 0);
      } else {
        hideHandleAndGuide();
      }
    });
    return storedState.value;
  };

  function getSelectedTh(instance) {
    var selectedRange = instance.getSelected();
    return instance.view.wt.wtTable.getRowHeader(selectedRange[0]);
  }

  function showHandle(instance) {
    var th = getSelectedTh(instance);
    setupHandlePosition.call(instance, th);
    addClass(handle, 'active');
  }

  function setupHandlePosition(TH) {
    if (!TH) {
      return;
    }
    var instance = this;
    currentTH = TH;

    var row = this.view.wt.wtTable.getCoords(TH).row; // getCoords returns WalkontableCellCoords
    if (row >= 0) { // if not row header
      currentRow = row;
      var box = currentTH.getBoundingClientRect();
      startOffset = box.top;
      handle.style.top = startOffset + 'px';
      handle.style.height = box.height + 'px';

      border.style.top = startOffset + 'px';
      border.style.width = instance.view.maximumVisibleElementWidth(0) + 'px';

      instance.rootElement.appendChild(handle);
      instance.rootElement.appendChild(border);
    }
  }

  function refreshHandlePosition(TH, delta) {
    if (!TH) {
      return handle.style.top = -1000 + 'px';
    }
    var box = TH.getBoundingClientRect();
    var top = box.top;
    if (delta > 0) {
      top += box.height;
    }
    handle.style.top = top + 'px';
    border.style.top = top + 'px';
  }

  function setupGuidePosition() {
    var instance = this;
    showHandleAndGuide();
    currentTH = getSelectedTh(instance) || currentTH;
    var box = currentTH.getBoundingClientRect();
    startOffset = box.top;
    guide.style.width = instance.view.maximumVisibleElementWidth(0) + 'px';
    guide.style.height = box.height + 'px';
    guide.style.top = startOffset + 'px';
    guide.style.left = handle.style.left;
    instance.rootElement.appendChild(guide);
  }

  function refreshGuidePosition(diff) {
    guide.style.top = startOffset + diff + 'px';
  }

  function showHandleAndGuide() {
    addClass(handle, 'active');
    addClass(guide, 'active');
    addClass(border, 'active');
    addClass(document.body, 'pressed');
  }

  function hideHandleAndGuide() {
    removeClass(handle, 'active');
    removeClass(guide, 'active');
    removeClass(border, 'active');
    removeClass(document.body, 'pressed');
  }

  var checkRowHeader = function(element) {
    if (element.tagName != 'BODY') {
      if (element.parentNode.tagName == 'TBODY') {
        return true;
      } else {
        element = element.parentNode;
        return checkRowHeader(element);
      }
    }
    return false;
  };

  var getTHFromTargetElement = function(element, pressed) {
    if (element.tagName != 'TABLE') {
      if (element.tagName == 'TH') {
        return element;
      } else if (element.tagName == 'TD' && pressed) {
        return element.parentNode.firstChild;
      } else {
        return getTHFromTargetElement(element.parentNode, pressed);
      }
    }
    return null;
  };

  var bindEvents = function() {
    var instance = this;
    var selectedHeader = instance.selection.selectedHeader;
    var pressed, delta;

    eventManager.addEventListener(instance.rootElement, 'mouseover', function(e) {
      if (selectedHeader.rows && !selectedHeader.cols && checkRowHeader(e.target)) {
        var th = getTHFromTargetElement(e.target, pressed);
        if (th) {
          endRow = instance.view.wt.wtTable.getCoords(th).row;
          delta = endRow - startRow;
          if (!pressed) {
            th = getSelectedTh(instance);
            delta = 0;
          }
          refreshHandlePosition(th, delta);
        }
      }
    });

    eventManager.addEventListener(instance.rootElement, 'mousedown', function(e) {
      if (hasClass(e.target, 'manualRowMover')) {
        startY = pageY(e);
        setupGuidePosition.call(instance);
        pressed = instance;

        startRow = currentRow;
        endRow = currentRow;
      }
    });

    eventManager.addEventListener(window, 'mousemove', function(e) {
      if (pressed) {
        refreshGuidePosition(pageY(e) - startY);
      }
    });

    eventManager.addEventListener(window, 'mouseup', function(e) {
      if (pressed) {
        hideHandleAndGuide();
        pressed = false;

        // createPositionData(instance.manualRowPositions, instance.countRows());
        // instance.manualRowPositions.splice(endRow, 0, instance.manualRowPositions.splice(startRow, 1)[0]);

        Handsontable.hooks.run(instance, 'beforeRowMove', startRow, endRow);

        // instance.forceFullRender = true;
        // instance.view.render(); // updates all

        // saveManualRowPositions.call(instance);

        // 选中移动后的结果行
        instance.selection.setSelectedHeaders(true, false);
        instance.selectCell(endRow, 0, endRow, instance.countCols() - 1);

        Handsontable.hooks.run(instance, 'afterRowMove', startRow, endRow);

        setupHandlePosition.call(instance, currentTH);
      }
    });

    instance.addHook('afterDestroy', unbindEvents);
  };

  var unbindEvents = function() {
    eventManager.clear();
  };

  var createPositionData = function(positionArr, len) {
    if (positionArr.length < len) {
      for (var i = positionArr.length; i < len; i++) {
        positionArr[i] = i;
      }
    }
  };

  this.beforeInit = function() {
    this.manualRowPositions = [];
  };

  this.init = function(source) {
    var instance = this;
    var manualRowMoveEnabled = !!(instance.getSettings().manualRowMove);

    if (manualRowMoveEnabled) {
      var initialManualRowPositions = instance.getSettings().manualRowMove;
      var loadedManualRowPostions = loadManualRowPositions.call(instance);

      // update plugin usages count for manualColumnPositions
      if (typeof instance.manualRowPositionsPluginUsages === 'undefined') {
        instance.manualRowPositionsPluginUsages = ['manualColumnMove'];
      } else {
        instance.manualRowPositionsPluginUsages.push('manualColumnMove');
      }

      if (typeof loadedManualRowPostions != 'undefined') {
        this.manualRowPositions = loadedManualRowPostions;
      } else if (Array.isArray(initialManualRowPositions)) {
        this.manualRowPositions = initialManualRowPositions;
      } else {
        this.manualRowPositions = [];
      }

      if (source === 'afterInit' || source === 'afterUpdateSettings' && eventManager.context.eventListeners.length === 0) {
        bindEvents.call(this);
        if (this.manualRowPositions.length > 0) {
          instance.forceFullRender = true;
          instance.render();
        }
      }
    } else {
      var pluginUsagesIndex = instance.manualRowPositionsPluginUsages ? instance.manualRowPositionsPluginUsages.indexOf('manualColumnMove') : -1;
      if (pluginUsagesIndex > -1) {
        unbindEvents.call(this);
        instance.manualRowPositions = [];
        instance.manualRowPositionsPluginUsages[pluginUsagesIndex] = void 0;
      }
    }

  };

  this.modifyRow = function(row) {
    var instance = this;
    if (instance.getSettings().manualRowMove) {
      if (typeof instance.manualRowPositions[row] === 'undefined') {
        createPositionData(this.manualRowPositions, row + 1);
      }
      return instance.manualRowPositions[row];
    }

    return row;
  };
}

var htManualRowMove = new ManualRowMove();

Handsontable.hooks.add('beforeInit', htManualRowMove.beforeInit);
Handsontable.hooks.add('afterInit',  function() {
  htManualRowMove.init.call(this, 'afterInit');
});

Handsontable.hooks.add('afterUpdateSettings', function() {
  htManualRowMove.init.call(this, 'afterUpdateSettings');
});

Handsontable.hooks.add('modifyRow', htManualRowMove.modifyRow);
Handsontable.hooks.register('beforeRowMove');
Handsontable.hooks.register('afterRowMove');
