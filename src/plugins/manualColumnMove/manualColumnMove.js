
import {addClass, hasClass, removeClass} from './../../helpers/dom/element';
import {eventManager as eventManagerObject} from './../../eventManager';
import {pageX, pageY} from './../../helpers/dom/event';
import {registerPlugin} from './../../plugins';

export {ManualColumnMove};

/**
 * HandsontableManualColumnMove
 *
 * Has 2 UI components:
 * - handle - the draggable element that sets the desired position of the column
 * - guide - the helper guide that shows the desired position as a vertical guide
 *
 * Warning! Whenever you make a change in this file, make an analogous change in manualRowMove.js
 *
 * @private
 * @class ManualColumnMove
 * @plugin ManualColumnMove
 */
function ManualColumnMove() {
  var startCol, endCol, startX, startOffset, currentCol, instance, currentTH, handle = document.createElement('DIV'),
    guide = document.createElement('DIV'),
    border = document.createElement('DIV'),
    eventManager = eventManagerObject(this);

  handle.className = 'manualColumnMover';
  guide.className = 'manualColumnMoverGuide';
  border.className = 'manualColumnMoverBorder';

  var saveManualColumnPositions = function() {
    var instance = this;
    Handsontable.hooks.run(instance, 'persistentStateSave', 'manualColumnPositions', instance.manualColumnPositions);
  };

  var loadManualColumnPositions = function() {
    var instance = this;
    var storedState = {};
    Handsontable.hooks.run(instance, 'persistentStateLoad', 'manualColumnPositions', storedState);
    instance.addHook('selectedHeaderChange', function (rowSelected, colSelected) {
      if (colSelected) {
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
    return instance.view.wt.wtTable.getColumnHeader(selectedRange[1]);
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
    instance = this;
    currentTH = TH;

    var col = this.view.wt.wtTable.getCoords(TH).col; // getCoords returns WalkontableCellCoords
    if (col >= 0) { // if not row header
      currentCol = col;
      var box = currentTH.getBoundingClientRect();
      startOffset = box.left;
      handle.style.left = startOffset + 'px';
      handle.style.width = box.width + 'px';

      border.style.left = startOffset + 'px';
      border.style.height = instance.view.maximumVisibleElementHeight(0) + 'px';

      instance.rootElement.appendChild(handle);
      instance.rootElement.appendChild(border);
    }
  }

  function refreshHandlePosition(TH, delta) {
    if (!TH) {
      return handle.style.left = -1000 + 'px';
    }
    var box = TH.getBoundingClientRect();
    var left = box.left;
    if (delta > 0) {
      left += box.width;
    }
    handle.style.left = left + 'px';
    border.style.left = left + 'px';
  }

  function setupGuidePosition() {
    var instance = this;
    showHandleAndGuide();
    currentTH = getSelectedTh(instance) || currentTH;
    var box = currentTH.getBoundingClientRect();
    startOffset = box.left;
    guide.style.width = box.width + 'px';
    guide.style.height = instance.view.maximumVisibleElementHeight(0) + 'px';
    guide.style.top = handle.style.top;
    guide.style.left = startOffset + 'px';
    instance.rootElement.appendChild(guide);
  }

  function refreshGuidePosition(diff) {
    guide.style.left = startOffset + diff + 'px';
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

  var checkColumnHeader = function(element) {
    if (element.tagName != 'BODY') {
      if (element.parentNode.tagName == 'THEAD' || element.parentNode.tagName == 'TBODY') {
        return true;
      } else {
        element = element.parentNode;
        return checkColumnHeader(element);
      }
    }
    return false;
  };

  var getTHFromTargetElement = function(element, pressed, instance) {
    if (element.tagName != 'TABLE') {
      if (element.tagName == 'TH') {
        return element;
      } else if (element.tagName == 'TD' && pressed) {
        return instance.view.wt.wtTable.getColumnHeader(instance.view.wt.wtTable.getCoords(element).col);;
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
      if (!selectedHeader.rows && selectedHeader.cols && checkColumnHeader(e.target)) {
        var th = getTHFromTargetElement(e.target, pressed, instance);
        if (th) {
          var col = instance.view.wt.wtTable.getCoords(th).col;
          if (col >= 0) { // not TH above row header
            endCol = col;
            delta = endCol - startCol;
            if (!pressed) {
              th = getSelectedTh(instance);
              delta = 0;
            }
            refreshHandlePosition(th, delta);
          }          
        }
      }
    });

    eventManager.addEventListener(instance.rootElement, 'mousedown', function(e) {
      if (hasClass(e.target, 'manualColumnMover')) {
        startX = pageX(e);
        setupGuidePosition.call(instance);
        pressed = instance;

        startCol = currentCol;
        endCol = currentCol;
      }
    });

    eventManager.addEventListener(window, 'mousemove', function(e) {
      if (pressed) {
        refreshGuidePosition(pageX(e) - startX);
      }
    });

    eventManager.addEventListener(window, 'mouseup', function(e) {
      if (pressed) {
        hideHandleAndGuide();
        pressed = false;

        // createPositionData(instance.manualColumnPositions, instance.countCols());
        // instance.manualColumnPositions.splice(endCol, 0, instance.manualColumnPositions.splice(startCol, 1)[0]);

        Handsontable.hooks.run(instance, 'beforeColumnMove', startCol, endCol);

        // instance.forceFullRender = true;
        // instance.view.render(); // updates all

        // 选中移动后的结果行
        instance.selection.setSelectedHeaders(false, true);
        instance.selectCell(0, endCol, instance.countRows() - 1, endCol);

        // saveManualColumnPositions.call(instance);

        Handsontable.hooks.run(instance, 'afterColumnMove', startCol, endCol);

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
    this.manualColumnPositions = [];
  };

  this.init = function(source) {
    var instance = this;

    var manualColMoveEnabled = !!(this.getSettings().manualColumnMove);

    if (manualColMoveEnabled) {
      var initialManualColumnPositions = this.getSettings().manualColumnMove;

      var loadedManualColumnPositions = loadManualColumnPositions.call(instance);

      if (typeof loadedManualColumnPositions != 'undefined') {
        this.manualColumnPositions = loadedManualColumnPositions;
      } else if (Array.isArray(initialManualColumnPositions)) {
        this.manualColumnPositions = initialManualColumnPositions;
      } else {
        this.manualColumnPositions = [];
      }

      if (source === 'afterInit' || source === 'afterUpdateSettings' && eventManager.context.eventListeners.length === 0) {

        // update plugin usages count for manualColumnPositions
        if (typeof instance.manualColumnPositionsPluginUsages === 'undefined') {
          instance.manualColumnPositionsPluginUsages = ['manualColumnMove'];
        } else {
          instance.manualColumnPositionsPluginUsages.push('manualColumnMove');
        }

        bindEvents.call(this);
        if (this.manualColumnPositions.length > 0) {
          this.forceFullRender = true;
          this.render();
        }
      }

    } else {
      var pluginUsagesIndex = instance.manualColumnPositionsPluginUsages ? instance.manualColumnPositionsPluginUsages.indexOf('manualColumnMove') : -1;

      if (pluginUsagesIndex > -1) {
        unbindEvents.call(this);
        this.manualColumnPositions = [];
        instance.manualColumnPositionsPluginUsages[pluginUsagesIndex] = void 0;
      }
    }
  };

  this.modifyCol = function(col) {
    // TODO test performance: http://jsperf.com/object-wrapper-vs-primitive/2
    if (this.getSettings().manualColumnMove) {
      if (typeof this.manualColumnPositions[col] === 'undefined') {
        createPositionData(this.manualColumnPositions, col + 1);
      }
      return this.manualColumnPositions[col];
    }

    return col;
  };

  // need to reconstruct manualcolpositions after removing columns
  this.afterRemoveCol = function(index, amount) {
    if (!this.getSettings().manualColumnMove) {
      return;
    }
    var rmindx,
      colpos = this.manualColumnPositions;

    // We have removed columns, we also need to remove the indicies from manual column array
    rmindx = colpos.splice(index, amount);

    // We need to remap manualColPositions so it remains constant linear from 0->ncols
    colpos = colpos.map(function(colpos) {
      var i, newpos = colpos;

      for (i = 0; i < rmindx.length; i++) {
        if (colpos > rmindx[i]) {
          newpos--;
        }
      }

      return newpos;
    });

    this.manualColumnPositions = colpos;
  };

  // need to reconstruct manualcolpositions after adding columns
  this.afterCreateCol = function(index, amount) {
    if (!this.getSettings().manualColumnMove) {
      return;
    }
    var colpos = this.manualColumnPositions;

    if (!colpos.length) {
      return;
    }
    var addindx = [];

    for (var i = 0; i < amount; i++) {
      addindx.push(index + i);
    }

    if (index >= colpos.length) {
      colpos.concat(addindx);
    } else {
      // We need to remap manualColPositions so it remains constant linear from 0->ncols
      colpos = colpos.map(function(colpos) {
        return (colpos >= index) ? (colpos + amount) : colpos;
      });

      // We have added columns, we also need to add new indicies to manualcolumn position array
      colpos.splice.apply(colpos, [index, 0].concat(addindx));
    }

    this.manualColumnPositions = colpos;
  };
}

var htManualColumnMove = new ManualColumnMove();

Handsontable.hooks.add('beforeInit', htManualColumnMove.beforeInit);
Handsontable.hooks.add('afterInit', function() {
  htManualColumnMove.init.call(this, 'afterInit');
});

Handsontable.hooks.add('afterUpdateSettings', function() {
  htManualColumnMove.init.call(this, 'afterUpdateSettings');
});
Handsontable.hooks.add('modifyCol', htManualColumnMove.modifyCol);

Handsontable.hooks.add('afterRemoveCol', htManualColumnMove.afterRemoveCol);
Handsontable.hooks.add('afterCreateCol', htManualColumnMove.afterCreateCol);
Handsontable.hooks.register('beforeColumnMove');
Handsontable.hooks.register('afterColumnMove');
