/*
 * Controller.js
 * This controller app emulates the TI Edu Boosterpack MKII I/O Pack.
 * A virtual canvas with rounded and square buttons are overlay on
 * top of the gamepad image for mouseover and click detection.
 * Toggle the ON/OFF switch (left hand corner) to connect/disconnect
 * with the IoT hardware. Use tooltip (right hand corner) to learn
 * further regarding the BLE characteristic/features. App also support
 * entry of 2 bytes for lab grading purposes. (The edX MOOC is archived
 * at the moment Dec 15 2016)
 *
 */

var Controller = (function(global) {

  function setCursorStyle(style) {
    canvas.style.cursor = (style==1) ? "pointer" : "default";
  }

  // Square Button Class //
  var SquareButton = function(top,left,width,height,enabled,sw_func) {
    this.top = top;
    this.left = left;
    this.width = width;
    this.height = height;
    this.enabled = enabled;
    this.sw_func = sw_func;
  }

  SquareButton.prototype.swEnable = function() {
    this.enabled = true;
  }

  SquareButton.prototype.swDisable = function() {
    this.enabled = false;
  }

  SquareButton.prototype.onhover = function() {
    switch (this.sw_func) {
      case 'time':
        tooltip.innerText = "Click: Read Time";
        setCursorStyle(1);
        break;
      case 'light':
        tooltip.innerText = "Click: Read light";
        setCursorStyle(1);
        break;
      case 'steps':
        tooltip.innerText = "Subscribe Steps Notification";
        setCursorStyle(1);
        break;
      case 'temp':
        tooltip.innerText = "Click: Read Temperature";
        setCursorStyle(1);
      default:
        break;
    }
  }

  SquareButton.prototype.onclick = function() {

    if(this.enabled == false) { return }

    switch(this.sw_func) {

      case 'steps':
        if (!ble.isStepsNotify()) {
          ble.enableStepsNotification(function(event) {
            let step = event.target.value.getInt16();
            console.log('Total Steps (Notified): ' + step);
            clearfillLCDText(startx+font_width*5,
              starty+new_line,font_width,font_height,'#faff00',step);
          });
        } else {
          ble.disableStepsNotification();
        }
        break;

      case 'light':
        ble.readLight(function(light) {
          clearfillLCDText(startx+v_split+font_width*5,
            starty,font_width+3,font_height,'#63ff4f',light);
        });
        break;

      case 'temp':
        ble.readTemp(function(temp) {
          clearfillLCDText(startx+font_width*5,
            starty,font_width+3,font_height,'#38f441',temp);
        });
        break;

      case 'time':
        ble.readTime(function(time) {
          clearfillLCDText(startx+font_width*5,starty+new_line*7,
            font_width*3,font_height,'#eddb55',Math.trunc(time/10).toString() + '.' + (time % 10).toString());
        });
        break;

      default:
        break;
    }

  }

  // Round Button Class //
  var RoundButton = function(top,left,size,enabled,sw_func) {
    this.top = top;
    this.left = left;
    this.size = size;
    this.enabled = enabled;
    this.sw_func = sw_func;
  }

  RoundButton.prototype.swEnable = function() {
    this.enabled = true;
  }

  RoundButton.prototype.swDisable = function() {
    this.enabled = false;
  }

  RoundButton.prototype.onhover = function() {
    switch (this.sw_func) {
      case 'sound':
        tooltip.innerText = "Click: Read Sound";
        setCursorStyle(1);
        break;
      case 'plot_state_up':
        tooltip.innerText = "Change Plot Mode (Up)";
        setCursorStyle(1);
        break;
      case 'plot_state_down':
        tooltip.innerText = "Change Plot Mode (Down)";
        setCursorStyle(1);
        break;
      default:
        break;
    }
  }

  RoundButton.prototype.onclick = function() {

    if(this.enabled == false) { return }

    switch(this.sw_func) {

      case "sound":
        ble.readSound(function(sound) {
          clearfillLCDText(startx+v_split+font_width*6,
            starty+new_line,font_width,font_height,'#00ffed',sound);
        });
        break;

      case 'plot_state_up':
        ble.plotStateUp(function(status,mode) {
          if (status) {
            let plotmode;
            switch (parseInt(mode, 10)) {
              case 0:
                plotmode = "Accel. vs Time";
                break;
              case 1:
                plotmode = "Sound vs Time";
                break;
              case 2:
                plotmode = "Temp vs Time";
                break;
              default:
                plotmode = "Accel. vs Time";
            }
            clearfillLCDText(startx,starty+new_line*4,
              font_width*6,font_height,'#7bc9d8',
              "Plot State: " + plotmode);
          }
        });
        break;

      case 'plot_state_down':
        ble.plotStateDown(function(status,mode) {
          let plotmode;
          if (status) {
            switch (parseInt(mode, 10)) {
              case 0:
                plotmode = "Accel. vs Time";
                break;
              case 1:
                plotmode = "Sound vs Time";
                break;
              case 2:
                plotmode = "Temp vs Time";
                break;
              default:
                plotmode = "Accel. vs Time";
            }
            clearfillLCDText(startx,starty+new_line*4,
              font_width*6,font_height,'#7bc9d8',
              "Plot State: " + plotmode);
          }
        });
        break;

      default:
        break;
    }

  }

  var doc = global.document;
  var win = global.window;

  var canvas = doc.getElementById('myCanvas');
  var ctx = canvas.getContext('2d');
  var gamepadsw = doc.getElementById('myonoffswitch');
  var tooltip = doc.getElementById('tooltip');
  var grader = doc.getElementById('grader');
  var submit_btn = grader.elements[1];
  var code;

  var gamepad_url = 'images/gamepad.png';

  // LCD display vars //
  var time=0;
  var lcd_width = 157;
  var lcd_height = 141;
  var font_width = 8;
  var font_height = 11;
  var new_line = 16;
  var startx = 245;
  var starty = 139;
  var plot_x_margin = 18;
  var v_split = (lcd_width/2);
  var h_split = (lcd_height/2);

  // Buttons vars //
  // BUTTONS params: TOP LEFT WIDTH HEIGHT ENABLED FUNC
  var light_btn = new SquareButton(90,266,11,11,false,'light');
  var steps_btn = new SquareButton(125,439,18,18,false,'steps');
  var time_btn = new SquareButton(121,238,156,141,false,'time');
  var temp_btn = new SquareButton(85,346,14,14,false,'temp');

  var sound_btn = new RoundButton(254,184,15,false,'sound');
  var plotstate_btn1 = new RoundButton(129,499,10,false,'plot_state_up');
  var plotstate_btn2 = new RoundButton(186,499,10,false,'plot_state_down');

  var clickButtons = new Array();

  clickButtons.push(light_btn);
  clickButtons.push(steps_btn);
  clickButtons.push(time_btn);
  clickButtons.push(temp_btn);
  clickButtons.push(sound_btn);
  clickButtons.push(plotstate_btn1);
  clickButtons.push(plotstate_btn2);

  function buttonsDisable() {
    light_btn.swDisable();
    steps_btn.swDisable();
    time_btn.swDisable();
    sound_btn.swDisable();
    plotstate_btn1.swDisable();
    plotstate_btn2.swDisable();
    submit_btn.disabled = true;
  }

  function toggleSwitch() {
    ble.connectToggle();
    if(!this.checked) {
      powerDown();
    }
  }

  function powerDown() {
    closeSwitch();
    ble.resetVariables();
    buttonsDisable();
  }

  function attachSwitchClickListener() {
    gamepadsw.addEventListener('click', toggleSwitch);
  }

  function closeSwitch() {
    gamepadsw.checked = false;
  }

  function clearfillLCDText(x,y,w,h,color,text) {
    ctx.fillStyle = '#000000';
    ctx.fillRect(x-(font_width/2),y-font_height,w*3,h*1.5);
    ctx.fillStyle = color;
    ctx.fillText(text,x,y);
  }

  function drawLCD() {
    ctx.font = "12px Arial";
    ctx.fillStyle = '#ffffff';

    ctx.fillText("Temp= ",startx, starty);
    ctx.fillText("N/A",startx + font_width*5, starty);

    ctx.fillText("Light= ",startx + v_split, starty);
    ctx.fillText("N/A",startx + v_split + font_width*5, starty);

    ctx.fillText("Step= ",startx,starty + new_line);
    ctx.fillText("N/A",startx + font_width*5, starty + new_line);

    ctx.fillText("Sound= ",startx + v_split, starty + new_line);
    ctx.fillText("N/A",startx + v_split + font_width*6, starty + new_line);

    ctx.fillText("Time= ",startx, starty + new_line*7);
  }

  function attachCanvasHoverListener() {
    canvas.addEventListener('mousemove', function(e) {
      var x = e.clientX;
      var y = e.clientY;

      tooltip.innerText = "No Feature";
      setCursorStyle(0);

      clickButtons.forEach(function(button) {
        if(button instanceof RoundButton) {
          let x_dist_pow = Math.pow(x - button.left, 2);
          let y_dist_pow = Math.pow(y - button.top, 2);
          let r_dist_pow = Math.pow(button.size, 2);
          let in_range_bool = ((x_dist_pow + y_dist_pow) < r_dist_pow);
          if(in_range_bool) {
            button.onhover();
          }
        } else if(button instanceof SquareButton) {
          let x_range_bool = (x > button.left) && (x < button.left + button.width);
          let y_range_bool = (y > button.top) && (y < button.top + button.height);
          if(x_range_bool && y_range_bool) {
            button.onhover();
          }
        }
      });
    },false);
  }

  function attachCanvasClickListener() {
    canvas.addEventListener('click', function(e) {
      var x = e.clientX;
      var y = e.clientY;

      clickButtons.forEach(function(button) {
        if(button instanceof RoundButton) {
          let x_dist_pow = Math.pow(x - button.left, 2);
          let y_dist_pow = Math.pow(y - button.top, 2);
          let r_dist_pow = Math.pow(button.size, 2);
          let in_range_bool = ((x_dist_pow + y_dist_pow) < r_dist_pow);
          if(in_range_bool) {
            button.onclick();
          }
        } else if(button instanceof SquareButton) {
          let x_range_bool = (x > button.left) && (x < button.left + button.width);
          let y_range_bool = (y > button.top) && (y < button.top + button.height);
          if(x_range_bool && y_range_bool) {
            button.onclick();
          }
        } else {
          console.log('BUTTON NOT DEFINED!!!!!');
        }
      });

    },false);
  }

  function attachSubmitClickListener() {
    submit_btn.disabled = true;
    submit_btn.addEventListener('click',function() {
      if(!submit_btn.disabled) {
        let re = /[0-9a-fA-F]{4}/g;    // 2-bytes hex code
        code = grader.elements[0].value;
        if(re.test(code)) {
          ble.activateGrader(code);
        }
      } else {
        console.log('No edX grader characteristic found - check ble connection');
      }
    },false);
  }

  function init() {
    var img = new Image();
    img.onload = function() {
      ctx.fillStyle = '#6b5e5e';
      ctx.fillRect(0,0,canvas.width,canvas.height);
      ctx.drawImage(img,0,0);
      drawLCD();
      attachCanvasClickListener();
      attachSwitchClickListener();
      attachCanvasHoverListener();
      attachSubmitClickListener();
    }
    img.src = gamepad_url;
  }

  // RUN ->
  init();

  // Assign context object to global for ease of access //
  global.ctx = ctx;
  global.sound_btn = sound_btn;
  global.steps_btn = steps_btn;
  global.time_btn = time_btn;
  global.temp_btn = temp_btn;
  global.light_btn = light_btn;
  global.plotstate_btn1 = plotstate_btn1;
  global.plotstate_btn2 = plotstate_btn2;
  global.submit_btn = submit_btn;
  global.powerDown = powerDown;

})(this);
