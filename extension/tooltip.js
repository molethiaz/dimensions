var body = document.querySelector('body');
var port = chrome.runtime.connect({ name: "dimensions" });
var changeDelay = 300;
var changeTimeout;
var paused = false;
var inputX, inputY;
var altKeyWasPressed = false;

window.addEventListener('mousemove', onInputMove);
window.addEventListener('touchmove', onInputMove);
window.addEventListener('scroll', onAreaChange);
window.addEventListener('unload', onUnloadEvent);

window.addEventListener('keydown', detectAltKeyPress);
window.addEventListener('keyup', detectAltKeyRelease);

port.onMessage.addListener(function(event){
  switch(event.type){
    case 'distances':
      showDimensions(event.data);
      break;
    case 'screenshot taken':
      resume();
      // debugScreenshot(event.data);
      break;
    case 'destroyTooltip':
      destroy();
      break;
  }
});

function debugScreenshot(src){
  var oldscreen = body.querySelector('.screenshot');
  oldscreen && body.removeChild(oldscreen);

  var screenshot = new Image();
  screenshot.src = src;
  screenshot.className = 'screenshot';
  body.appendChild(screenshot);
}

function destroy(){
  window.removeEventListener('mousemove', onInputMove);
  window.removeEventListener('touchmove', onInputMove);
  window.removeEventListener('scroll', onAreaChange);

  removeDimensions();
}

function removeDimensions(){
  var dimensions = body.querySelector('.fn-dimensions');
  if(dimensions)
    body.removeChild(dimensions);
}

function onAreaChange(){
  pause();

  if(changeTimeout)
    clearTimeout(changeTimeout);

  changeTimeout = setTimeout(requestNewScreenshot, changeDelay);
}

function onUnloadEvent(){
  port.postMessage({ type: 'destroy' });
}

function requestNewScreenshot(){
  port.postMessage({ type: 'newScreenshot' });
}

function pause(){
  paused = true;
  removeDimensions();
}

function resume(){
  paused = false;
}

function detectAltKeyPress(event){
  if(event.altKey){
    altKeyWasPressed = true;
    sendToWorker(event);
  }
}

function detectAltKeyRelease(event){
  if(altKeyWasPressed){
    altKeyWasPressed = false;
    sendToWorker(event);
  }
}

//
// onInputMove
// ===========
//  
// detects the current pointer position and requests the dimensions at that position
//

function onInputMove(event){
  if(event.touches){
    inputX = event.touches[0].clientX;
    inputY = event.touches[0].clientY;
  } else {
    inputX = event.clientX;
    inputY = event.clientY;
  }

  sendToWorker(event);
}

function sendToWorker(event){
  port.postMessage({ 
    type: event.altKey ? 'area' : 'position', 
    data: { x: inputX, y: inputY }
  });
}

//
// showDimensions
// ==============
//  
// renders the visualisation of the measured dimensions
//

function showDimensions(dimensions){
  if(paused)
    return;

  removeDimensions();

  if(!dimensions)
    return;

  var newDimensions = document.createElement('div');
  newDimensions.className = 'fn-dimensions';
  newDimensions.style.left = dimensions.x + "px";
  newDimensions.style.top = dimensions.y + "px";

  var measureWidth = dimensions.left + dimensions.right;
  var measureHeight = dimensions.top + dimensions.bottom;

  var xAxis = document.createElement('div');
  xAxis.className = 'x fn-axis';
  xAxis.style.left = -dimensions.left + "px";
  xAxis.style.width = measureWidth + "px";

  var yAxis = document.createElement('div');
  yAxis.className = 'y fn-axis';
  yAxis.style.top = -dimensions.top + "px";
  yAxis.style.height = measureHeight + "px";

  var tooltip = document.createElement('div');
  tooltip.className = 'fn-tooltip';

  // add +1 on both axis because of the pixel below the mouse pointer
  tooltip.textContent = (measureWidth+1) +" x "+ (measureHeight+1) + " px";

  if(dimensions.y < 26)
    tooltip.classList.add('bottom');

  if(dimensions.x > window.innerWidth - 110)
    tooltip.classList.add('left');

  newDimensions.appendChild(xAxis);
  newDimensions.appendChild(yAxis);
  newDimensions.appendChild(tooltip);

  body.appendChild(newDimensions)
}