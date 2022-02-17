class Space2D {
   constructor(x, y) {
      this.x = x;
      this.y = y;
      this.map = new Map();
   }
   posToMapKey(x, y) {
      return x + '|' + y;
   }
   isPosValid(x, y) {
      return x >= 0 && x < this.x && y >= 0 && y < this.y;
   }
   isPosOccupied(x, y) {
      return this.map.has(this.posToMapKey(x, y));
   }
   occupy(occupier, x, y) {
      this.map.set(this.posToMapKey(x, y), occupier);
   }
   vacate(x, y) {
      this.map.delete(this.posToMapKey(x, y));
   }
   clear() {
      this.map.clear();
   }
}
class Robot {
   constructor(num) {
      this.number = num;
      this.x = -1;
      this.y = -1;
      this.facing = 0;  // 0 - north
                     // 1 - east
                     // 2 - south
                     // 3 - west
      this.space = null;
   }
   static facingAsString(facing) {
      const arr = [
         'NORTH',
         'EAST',
         'SOUTH',
         'WEST'
      ];
      return arr[facing];
   }
   place(x, y, facing) {
      if (!this.space.isPosValid(x, y)) {
         return -1;
      } else if (this.space.isPosOccupied(x, y)) {
         return -2;
      } else {
         if (this.space.isPosValid(this.x, this.y)) {
            this.space.vacate(this.x, this.y);
         }
         this.space.occupy(this, x, y);
         this.x = x;
         this.y = y;
         this.facing = facing;
         return 1;
      }
   }
   turn(side) {
      this.facing = (this.facing + 4 + side) % 4;
   }
   move(target) {
      let x = this.x, y = this.y;
      switch (this.facing) {
         case 0: 
            y++;
            break;
         case 1: 
            x++;
            break;
         case 2: 
            y--;
            break;
         case 3: 
            x--;
            break;
      }
      
      // Pass back the supposed target position:
      
      if (target) {
         target.x = x;
         target.y = y;
      }
      
      if (!this.space.isPosValid(x, y)) {
         return -1;
      } else if (this.space.isPosOccupied(x, y)) {
         return -2;
      } else {
         this.space.vacate(this.x, this.y);
         this.space.occupy(this, x, y);
         this.x = x;
         this.y = y;
         return 1;
      }
   }
}
class Table extends Space2D {
   constructor(x, y) {
      super(x, y);
      this.robots = new Map();
      this.activeRobot = null;
      this.lastRobotNumber = 0;
   }
   addRobot(x, y, facing) {
      const robo = new Robot(++this.lastRobotNumber);
      robo.space = this;
      robo.place(x, y, facing);
      this.robots.set(robo.number, robo);
      if (!this.activeRobot) {
         this.activeRobot = robo;
      }
      return robo;
   }
   chooseRobot(num) {
      if (this.robots.has(num)) {
         this.activeRobot = this.robots.get(num);
         return this.activeRobot;
      } else {
         return null;
      }
   }
   clear() {
      super.clear();
      this.robots.clear();
      this.lastRobotNumber = 0;
      this.activeRobot = null;
   }
}
const roboApp = {
   table: new Table(5, 5),
   options: {
      multiple: false,
      logging: true
   }
}
roboApp.executor = {
   execute(commands, multiple = false) {
      const table = roboApp.table;
      
      let robo = table.activeRobot;
      
      const arr = commands.split('\n');
      
      let result = {};
      
      for (let cmd of arr) {
         
         cmd = cmd.trim().toUpperCase();
         
         result.command = cmd;
         result.robot = robo;
         result.value = 0;
         
         if (cmd.startsWith('ROBOT ')) {
            let m = cmd.match(/^ROBOT[ ]+(\d+)/);
            if (table.chooseRobot(Number(m[1]))) {
               robo = table.activeRobot;
               result.robot = robo;
               result.value = 400;
            } else {
               result.value = -400;
            }
            result.command = 'ROBOT';
            result.params = m[1];
         } else if (cmd.startsWith('PLACE ')) {
            const m = cmd.match(/^PLACE[ ]+(\d+)[ ]*,\s*(\d+)\s*,\s*(NORTH|SOUTH|EAST|WEST)/);
            if (m) {
               let x = Number(m[1]),
                  y = Number(m[2]), 
                  facing = 'NESW'.indexOf(m[3].substr(0, 1));
               if (!table.isPosValid(x, y)) {
                  result.value = -100;
               } else if (table.isPosOccupied(x, y)) {
                  result.value = -101;
               } else {
                  if (!robo) {                        
                     // if there is no robot on the table, put a new one and activated it.
                     robo = table.addRobot(x, y, facing);
                     result.robot = robo;
                     result.value = 100;
                  } else if (roboApp.options.multiple) {
                     // if there are robots on the table and System is in Multiple Mode, put a new one without activating it.
                     result.robot = table.addRobot(x, y, facing);
                     result.value = 101;
                  } else {
                     // if there are robots on the table and System is in Single Mode, relocate the active robot.
                     robo.place(x, y, facing);
                     result.value = 102;
                  }
               }
               result.command = 'PLACE';
               result.params = `${x},${y}`;
            } else {
               result.value = -1;
            }
         } else if (!robo) {
            result.value = -2;
         } else if (cmd == 'LEFT') {
            robo.turn(-1);
            result.value = 300;
         } else if (cmd == 'RIGHT') {
            robo.turn(1);
            result.value = 300;
         } else if (cmd == 'MOVE') {
            let pos = {},
               iMove = robo.move(pos);
            if (iMove > 0) {
               result.value = 200;
            } else if (iMove == -1) {
               result.value = -200;
            } else if (iMove == -2) {
               result.value = -201;
            }
            result.params = `${pos.x},${pos.y}`;
         } else if (cmd == 'REPORT') {
            if (multiple) {
               this.doReport(table);
            } else {
               this.doReport(robo);
            }
            result.value = 1;
         } else if (cmd.length < 1) {
            ;
         } else {
            result.value = -1;
         }
         
         if (result.value !== 0) {
            this.commandExcuted(result);
         }
      }
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
      
      const iW = this.cellSize * table.x;
      const iH = this.cellSize * table.y;
      
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
      for (let i = 0; i < table.y; i++) {
         ctx.moveTo( 0, this.cellSize * i);
         ctx.lineTo(iW, this.cellSize * i);
      }
      for (let i = 0; i < table.x; i++) {
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
      let roboPosition = (robo) => {
         return `${robo.x},${robo.y},${Robot.facingAsString(robo.facing)}`
      };
      
      let msg;
      if (obj instanceof Robot) {
         msg = roboPosition(obj);
      } else {
         let robo = obj.activeRobot,
            iCount = obj.robots.size,
            sSuffix = '';
         if (iCount > 1) {    // Apply plural suffix
            sSuffix = 's';
         }
         msg = `${iCount} robot${sSuffix} on table`
         if (robo) {
            msg += `. Robot ${robo.number} at (${roboPosition(robo)}) is active`;
         }
      }
      
      roboApp.UI.elmOutput.innerHTML = msg;
      roboApp.view.log('REPORT: ' + msg);
   },
   whenCommandExcuted(r) {
      const robo = r.robot;
      let sMsg = '';
      switch (r.value) {
         case -1: 
            sMsg = 'ERROR: Invalid command - ' + r.command;
            break;
         case -2: 
            sMsg = 'ERROR: There is no active robot';
            break;
         case -100: 
            sMsg = `WARNING: Position (${r.params}) is out of table`;
            break;
         case -101: 
            sMsg = `WARNING: Position (${r.params}) is occupied`;
            break;
         case -200: 
            sMsg = `WARNING: Motion forbidden - (${r.params}) is out of table`;
            break;
         case -201: 
            sMsg = `WARNING: Motion forbidden - (${r.params}) is occupied`;
            break;
         case -400: 
            sMsg = `ERROR: Robot ${r.params} is not on table`;
            break;
         case 100: 
            sMsg = `DONE: Robot ${robo.number} was placed at (${robo.x},${robo.y}) and activated`;
            break;
         case 101: 
            sMsg = `DONE: Robot ${robo.number} was placed at (${robo.x},${robo.y})`;
            break;
         case 102: 
            sMsg = `DONE: Robot ${robo.number} was relocated to (${robo.x},${robo.y})`;
            break;
         case 200: 
            sMsg = `DONE: Robot ${robo.number} moved to (${robo.x},${robo.y})`;
            break;
         case 300: 
            sMsg = `DONE: Robot ${robo.number} turned to ${Robot.facingAsString(robo.facing)}`;
            break;
         case 400: 
            sMsg = `DONE: Robot ${robo.number} was activated`;
            break;
      }
      if (sMsg) {
         roboApp.view.log(sMsg);
      }
   },
   load() {
      roboApp.executor.commandExcuted = this.whenCommandExcuted;
      roboApp.executor.doReport = this.report;
      
      roboApp.UI.initialise();
      
      this.refresh();
   }
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
      let randomInt = (max) => {
         return Math.floor(max * Math.random());
      }
      let randomPlace = () => {
         return {
            x: randomInt(roboApp.table.x),
            y: randomInt(roboApp.table.y),
            facing: Robot.facingAsString(randomInt(4))
         }
      }
      let commands = [];
      
      let r = randomPlace();
      commands.push(`PLACE ${r.x},${r.y},${r.facing}`);
      
      for (let i = 0; i < 10; i++) {
         r = randomInt(3) - 1;
         if (r < 0) {
            commands.push('LEFT');
         } else if (r > 0) {
            commands.push('RIGHT');
         }
         if (Math.random() > 0.5) {
            commands.push('MOVE');
         }
         if (Math.random() > 0.9) {
            let r = randomPlace();
            commands.push(`PLACE ${r.x},${r.y},${r.facing}`);
         }
      }
      
      commands.push('REPORT');
      
      roboApp.UI.elmCommands.value = commands.join('\n');
      
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
      roboApp.executor.execute(cmd, roboApp.options.multiple);
      roboApp.view.refresh();
   },
   go() {
      this.exec(roboApp.UI.elmCommands.value);
   },
   whenStepKeyUp(event) {
      if (event.keyCode == 13) { // After user press ENTER key in the Step Input Box
         let cmd = event.target.value.trim().toUpperCase();
         if (cmd.length > 0) {
            roboApp.controller.exec(cmd);
            roboApp.view.addLineToTextBox(roboApp.UI.elmCommands, cmd);
            event.target.value = '';
         }
      }
   }
}
