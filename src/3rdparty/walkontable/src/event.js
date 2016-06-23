
import {
  closest,
  hasClass,
  isChildOf,
} from './../../../helpers/dom/element';
import {eventManager as eventManagerObject} from './../../../eventManager';

/**
 *
 */
function WalkontableEvent(instance) {
  var that = this;

  var eventManager = eventManagerObject(instance);

  //reference to instance
  this.instance = instance;

  var dblClickOrigin = [null, null];
  this.dblClickTimeout = [null, null];

  var onMouseDown = function(event) {
    var cell = that.parentCell(event.realTarget);

    if (hasClass(event.realTarget, 'corner')) {
      that.instance.getSetting('onCellCornerMouseDown', event, event.realTarget);
    } else if (cell.TD) {
      if (that.instance.hasSetting('onCellMouseDown')) {
        that.instance.getSetting('onCellMouseDown', event, cell.coords, cell.TD, that.instance);
      }
    }

    if (event.button !== 2) { //if not right mouse button
      if (cell.TD) {
        dblClickOrigin[0] = cell.TD;
        if (!Handsontable.mobileBrowser) {
          clearTimeout(that.dblClickTimeout[0]);
          that.dblClickTimeout[0] = setTimeout(function() {
            dblClickOrigin[0] = null;
          }, 1000);
        }
      }
    }
  };

  var onTouchMove = function(event) {
    var touch = event.changedTouches[0];
    var boundary = 10;

    if (Math.abs(touch.pageX - that.instance.touchStartX) > 10 || 
      Math.abs(touch.pageY - that.instance.touchStartY) > 10) {
      that.instance.touchMoving = true;
      console.log('on touch move');
    }  
  };

  var longTouchTimeout;

  ///**
  // * Update touch event target - if user taps on resize handle 'hit area', update the target to the cell itself
  // * @param event
  // */
  /*
   var adjustTapTarget = function (event) {
   var currentSelection
   , properTarget;

   if(hasClass(event.target,'SelectionHandle')) {
   if(that.instance.selections[0].cellRange) {
   currentSelection = that.instance.selections[0].cellRange.highlight;

   properTarget = that.instance.getCell(currentSelection, true);
   }
   }

   if(properTarget) {
   Object.defineProperty(event,'target',{
   value: properTarget
   });
   }

   return event;
   };*/

  var onTouchStart = function(event) {
    var container = this;
    var touch = event.changedTouches[0];
    that.instance.touchStartX = touch.pageX;
    that.instance.touchStartY = touch.pageY;
    eventManager.addEventListener(this, 'touchmove', onTouchMove);

    that.checkIfTouchMove = setTimeout(function() {
      
      if (that.instance.touchMoving !== true) {
        onMouseDown(event);
      }

      that.instance.touchMoving = void 0;
      eventManager.removeEventListener('touchmove', onTouchMove, false);

    }, 30);

  };

  var lastMouseOver;
  var onMouseOver = function(event) {
    var table, td;

    if (that.instance.hasSetting('onCellMouseOver')) {
      table = that.instance.wtTable.TABLE;
      td = closest(event.realTarget, ['TD', 'TH'], table);

      if (td && td !== lastMouseOver && isChildOf(td, table)) {
        lastMouseOver = td;
        that.instance.getSetting('onCellMouseOver', event, that.instance.wtTable.getCoords(td), td, that.instance);
      }
    }
  };

  /*  var lastMouseOut;
   var onMouseOut = function (event) {
   if (that.instance.hasSetting('onCellMouseOut')) {
   var TABLE = that.instance.wtTable.TABLE;
   var TD = closest(event.target, ['TD', 'TH'], TABLE);
   if (TD && TD !== lastMouseOut && isChildOf(TD, TABLE)) {
   lastMouseOut = TD;
   if (TD.nodeName === 'TD') {
   that.instance.getSetting('onCellMouseOut', event, that.instance.wtTable.getCoords(TD), TD);
   }
   }
   }
   };*/

  var onMouseUp = function(event) {
    if (event.button !== 2) { //if not right mouse button
      var cell = that.parentCell(event.realTarget);

      if (cell.TD === dblClickOrigin[0] && cell.TD === dblClickOrigin[1]) {
        if (hasClass(event.realTarget, 'corner')) {
          that.instance.getSetting('onCellCornerDblClick', event, cell.coords, cell.TD, that.instance);
        } else {
          that.instance.getSetting('onCellDblClick', event, cell.coords, cell.TD, that.instance);
        }
        dblClickOrigin[0] = null;
        dblClickOrigin[1] = null;
      } else if (cell.TD === dblClickOrigin[0]) {
        dblClickOrigin[1] = cell.TD;

        if (!Handsontable.mobileBrowser) {
          clearTimeout(that.dblClickTimeout[1]);
          that.dblClickTimeout[1] = setTimeout(function() {
            dblClickOrigin[1] = null;
          }, 500);
        }
      }
    }
  };

  var onTouchEnd = function(event) {
    clearTimeout(longTouchTimeout);
    //that.instance.longTouch == void 0;

    event.preventDefault();
    if (window.cow && window.cow.iOS) {
      setTimeout(function() {
        onMouseUp(event);
      }, 30);
    } else {
      onMouseUp(event);
    }

    //eventManager.removeEventListener(that.instance.wtTable.holder, "mouseup", onMouseUp);
  };

  eventManager.addEventListener(this.instance.wtTable.holder, 'mousedown', onMouseDown);
  eventManager.addEventListener(this.instance.wtTable.TABLE, 'mouseover', onMouseOver);
  eventManager.addEventListener(this.instance.wtTable.holder, 'mouseup', onMouseUp);

  // check if full HOT instance, or detached WOT AND run on mobile device
  // 2016mobile#12
  if (this.instance.wtTable.holder.parentNode.parentNode && Handsontable.mobileBrowser && !that.instance.wtTable.isWorkingOnClone()) {

    var classSelector = '.' + this.instance.wtTable.holder.parentNode.className.split(' ').join('.');

    eventManager.addEventListener(this.instance.wtTable.holder, 'touchstart', function(event) {
      that.instance.touchApplied = true;
      if (isChildOf(event.target, classSelector)) {
        onTouchStart.call(event.target, event);
      }
    });
    eventManager.addEventListener(this.instance.wtTable.holder, 'touchend', function(event) {
      that.instance.touchApplied = false;
      if (isChildOf(event.target, classSelector)) {
        onTouchEnd.call(event.target, event);
      }
    });

    if (!that.instance.momentumScrolling) {
      that.instance.momentumScrolling = {};
    }
    // eventManager.addEventListener(this.instance.wtTable.holder, 'scroll', function(event) {
    //   clearTimeout(that.instance.momentumScrolling._timeout);

    //   if (!that.instance.momentumScrolling.ongoing) {
    //     that.instance.getSetting('onBeforeTouchScroll');
    //   }
    //   that.instance.momentumScrolling.ongoing = true;

    //   that.instance.momentumScrolling._timeout = setTimeout(function() {
    //     if (!that.instance.touchApplied) {
    //       that.instance.momentumScrolling.ongoing = false;

    //       that.instance.getSetting('onAfterMomentumScroll');
    //     }
    //   }, 200);
    // });
  }

  eventManager.addEventListener(window, 'resize', function() {
    if (that.instance.getSetting('stretchH') !== 'none') {
      that.instance.draw();
    }
  });

  this.destroy = function() {
    clearTimeout(this.dblClickTimeout[0]);
    clearTimeout(this.dblClickTimeout[1]);

    eventManager.destroy();
  };
}

WalkontableEvent.prototype.parentCell = function(elem) {
  var cell = {};
  var TABLE = this.instance.wtTable.TABLE;
  var TD = closest(elem, ['TD', 'TH'], TABLE);

  if (TD && isChildOf(TD, TABLE)) {
    cell.coords = this.instance.wtTable.getCoords(TD);
    cell.TD = TD;

  } else if (hasClass(elem, 'wtBorder') && hasClass(elem, 'current')) {
    cell.coords = this.instance.selections.current.cellRange.highlight; //selections.current is current selected cell
    cell.TD = this.instance.wtTable.getCell(cell.coords);

  } else if (hasClass(elem, 'wtBorder') && hasClass(elem, 'area')) {
    if (this.instance.selections.area.cellRange) {
      cell.coords = this.instance.selections.area.cellRange.to; //selections.area is area selected cells
      cell.TD = this.instance.wtTable.getCell(cell.coords);
    }
  }

  return cell;
};

export {WalkontableEvent};

window.WalkontableEvent = WalkontableEvent;
