import * as robotics from './robotics.js';

const COMMAND_IGNORED         =    0,
      
      ERROR_INVALID_COMMAND   =   -1,
      ERROR_NO_ACTIVE_ROBOT   =   -2,
      ERROR_NOT_ON_TABLE      =   -3,
      
      WARNING_POS_INVALID     = -100,
      WARNING_POS_OCCUPIED    = -101,
      
      DONE_PLACED_ACTIVE      =  100,
      DONE_PLACED             =  101,
      DONE_RELOCATED          =  102,
      
      DONE_MOVED              =  200,
      DONE_TURNED             =  300,
      DONE_ACTIVATED          =  400;
      
const roboApp = {
   table: new robotics.Table(5, 5),
   executor: new robotics.Executor,
   options: {
      multiple: false,
      logging: true
   }
}
roboApp.UI = {
   tableCanvas: null,
   robotImages: [],
   initialise() {
      this.robotImages[0] = document.getElementById('man-north');
      this.robotImages[1] = document.getElementById('man-east');
      this.robotImages[2] = document.getElementById('man-south');
      this.robotImages[3] = document.getElementById('man-west');
      
      this.tableCanvas = document.getElementById('table');
      
      this.elmStep = document.getElementById('txt-step');
      this.elmCommands = document.getElementById('txt-commands');
      this.elmMessages = document.getElementById('txt-messages');
      
      this.elmOutput = document.getElementById('lbl-output');
      
      this.elmMultiple = document.getElementById('chk-multiple');
      this.elmLogging = document.getElementById('chk-logging');
       
      this.elmExamples = document.getElementById('menu-examples');
      this.elmMenuOpen = document.getElementById('menu-openfile');
      this.elmMenuRandom = document.getElementById('menu-randomise');
      this.elmMenuClear = document.getElementById('menu-clear');
      this.elmMenuGo = document.getElementById('menu-go');
   }
}
roboApp.view = {
   cellSize: 80,
   addLineToTextBox(elm, txt, scrollToBottom = true) {
      if (elm.value) {
         elm.value += '\n';
      }
      
      elm.value += txt;
      
      if (scrollToBottom) {
         elm.scrollTop = elm.scrollHeight - elm.clientHeight;
      }
   },
   drawTable(table, canvas) {
      
      const iW = this.cellSize * table.sizeX;
      const iH = this.cellSize * table.sizeY;
      
      const ctx = canvas.getContext("2d");
      
      // Clear the table:
      
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, iW, iH);
      
      // Draw the outer walls:
      
      ctx.lineWidth = 4;
      ctx.strokeStyle = '#778899';
      ctx.strokeRect(0, 0, iW, iH);
      
      // Draw the grid lines: 
      
      ctx.lineWidth = 2;
      ctx.beginPath();
      for (let i = 0; i < table.sizeY; i++) {
         ctx.moveTo( 0, this.cellSize * i);
         ctx.lineTo(iW, this.cellSize * i);
      }
      for (let i = 0; i < table.sizeX; i++) {
         ctx.moveTo(this.cellSize * i,  0);
         ctx.lineTo(this.cellSize * i, iH);
      }
      ctx.stroke();
      
      // Draw the robots: 
      
      ctx.font = 'bold 14px Arial';
      for (let key of table.robots.keys()) {
         let robo = table.robots.get(key);
         let img = roboApp.UI.robotImages[robo.facing],
            x = this.cellSize * robo.x,
            y = iH - this.cellSize * (robo.y + 1);
         ctx.drawImage(img, 
            x + (this.cellSize - img.width) / 2, 
            y + (this.cellSize - img.height) / 2
         );
         
         if (robo == table.activeRobot) {
            ctx.fillStyle = '#ff0000';
         } else {
            ctx.fillStyle = '#0000ff';
         }
         ctx.fillText(robo.number, x + this.cellSize - 20, y + 20);
      }
   },
   refresh() {
      this.drawTable(roboApp.table, roboApp.UI.tableCanvas);
      roboApp.UI.elmStep.focus();
   },
   clear() {
      roboApp.UI.elmStep.value = '';
      roboApp.UI.elmCommands.value = '';
      roboApp.UI.elmMessages.value = '';
      roboApp.UI.elmOutput.innerHTML = '';
      roboApp.UI.elmStep.focus();
      
      this.refresh();
   },
   log(msg) {
      if (roboApp.options.logging) {
         roboApp.view.addLineToTextBox(roboApp.UI.elmMessages, msg);
      }
   },
   report(obj) {
      
      // return a string indicating a robot's position and facing:
      let roboPosition = (robo) => `${robo.x},${robo.y},${robo.facingAsString()}`;
      
      let sMessage;
      if (obj instanceof robotics.Robot) {
         sMessage = roboPosition(obj);
      } else {
         let robo = obj.activeRobot,
             roboCount = obj.robots.size,
             suffix = '';
         if (roboCount > 1) {    // Apply plural suffix
            suffix = 's';
         }
         sMessage = `${roboCount} robot${suffix} on table`
         if (robo) {
            sMessage += `. Robot ${robo.number} at (${roboPosition(robo)}) is active`;
         }
      }
      
      roboApp.UI.elmOutput.innerHTML = sMessage;
      roboApp.view.log('REPORT: ' + sMessage);
   },
   whenCommandExcuted(result) {
      const robo = result.robot;
      let sMsg = '';
      switch (result.value) {
         case ERROR_INVALID_COMMAND: 
            sMsg = 'ERROR: Invalid command - ' + result.command;
            break;
         case ERROR_NO_ACTIVE_ROBOT: 
            sMsg = 'ERROR: There is no active robot';
            break;
         case ERROR_NO_ACTIVE_ROBOT: 
            sMsg = `ERROR: Robot ${result.params} is not on table`;
            break;
         case WARNING_POS_INVALID: 
            sMsg = `WARNING: Position (${result.params}) is out of table`;
            break;
         case WARNING_POS_OCCUPIED: 
            sMsg = `WARNING: Position (${result.params}) is occupied`;
            break;
         case DONE_PLACED_ACTIVE: 
            sMsg = `DONE: Robot ${robo.number} was placed at (${robo.x},${robo.y}) and activated`;
            break;
         case DONE_PLACED: 
            sMsg = `DONE: Robot ${robo.number} was placed at (${robo.x},${robo.y})`;
            break;
         case DONE_RELOCATED: 
            sMsg = `DONE: Robot ${robo.number} was relocated to (${robo.x},${robo.y})`;
            break;
         case DONE_MOVED: 
            sMsg = `DONE: Robot ${robo.number} moved to (${robo.x},${robo.y})`;
            break;
         case DONE_TURNED: 
            sMsg = `DONE: Robot ${robo.number} turned to ${robo.facingAsString()}`;
            break;
         case DONE_ACTIVATED: 
            sMsg = `DONE: Robot ${robo.number} was activated`;
            break;
      }
      if (sMsg) {
         roboApp.view.log(sMsg);
      }
   },
}
roboApp.controller = {
   chooseExample(event) {
      let req = new XMLHttpRequest();
      req.onreadystatechange = () => {
         if (req.readyState === 4 && req.status === 200) {
            roboApp.UI.elmCommands.value = req.responseText;
         }
      }
      req.open("GET", event.target.value, true);
      req.send(null);
      
      roboApp.UI.elmStep.focus();
   },
   openFile(event) {
      let reader = new FileReader();
      reader.onerror = () => {
         roboApp.view.log('FAILURE: Could not read file - ' + reader.error.code);
      }
      reader.onload = () => {
         roboApp.UI.elmCommands.value = reader.result;
      }
      reader.readAsText(event.target.files[0]);
   },
   randomise() {
      roboApp.UI.elmCommands.value = roboApp.executor.generateRandomCommands(roboApp.table);
      roboApp.UI.elmStep.focus();
   },
   clear() {
      roboApp.table.clear();
      roboApp.view.clear();
      roboApp.UI.elmStep.focus();
   },
   exec(cmd) {
      roboApp.options.multiple = roboApp.UI.elmMultiple.checked;
      roboApp.options.logging = roboApp.UI.elmLogging.checked;
      roboApp.executor.execute(roboApp.table, cmd, roboApp.options.multiple);
      roboApp.view.refresh();
   },
   go() {
      roboApp.controller.exec(roboApp.UI.elmCommands.value);
   },
   // After user press ENTER key in the Step Input Box
   whenStepKeyUp(event) {
      if (event.keyCode == 13) {
         const cmd = event.target.value.trim().toUpperCase();
         if (cmd.length > 0) {
            roboApp.controller.exec(cmd);
            roboApp.view.addLineToTextBox(roboApp.UI.elmCommands, cmd);
            event.target.value = '';
         }
      }
   },
   load() {
      roboApp.UI.initialise();
      
      roboApp.UI.elmExamples.addEventListener('change', roboApp.controller.chooseExample);
      roboApp.UI.elmMenuOpen.addEventListener('change', roboApp.controller.openFile);
      roboApp.UI.elmMenuRandom.addEventListener('click', roboApp.controller.randomise);
      roboApp.UI.elmMenuClear.addEventListener('click', roboApp.controller.clear);
      roboApp.UI.elmMenuGo.addEventListener('click', roboApp.controller.go);
      roboApp.UI.elmStep.addEventListener('keyup', roboApp.controller.whenStepKeyUp);
      
      roboApp.executor.excuted = roboApp.view.whenCommandExcuted;
      roboApp.executor.doReport = roboApp.view.report;
      
      roboApp.view.refresh();
   },
}

window.addEventListener('load', roboApp.controller.load);

