const DIR_NORTH = 0,
      DIR_EAST  = 1,
      DIR_SOUTH = 2,
      DIR_WEST  = 3,
      
      DIRECTION_WORDS = [
         'NORTH',
         'EAST',
         'SOUTH',
         'WEST'
      ];
      
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

class Space2D {
   constructor(sizeX, sizeY) {
      this.sizeX = sizeX;
      this.sizeY = sizeY;
      this.map = new Map();
   }
   posToMapKey(x, y) {
      return x + '|' + y;
   }
   isPosValid(x, y) {
      return x >= 0 && x < this.sizeX && y >= 0 && y < this.sizeY;
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
      this.facing = DIR_NORTH;
      this.space = null;
   }
   facingAsString() {
      return DIRECTION_WORDS[this.facing];
   }
   place(x, y, facing) {
      if (!this.space.isPosValid(x, y)) {
         return WARNING_POS_INVALID;
      } else if (this.space.isPosOccupied(x, y)) {
         return WARNING_POS_OCCUPIED;
      } else {
         if (this.space.isPosValid(this.x, this.y)) {
            this.space.vacate(this.x, this.y);
         }
         this.space.occupy(this, x, y);
         this.x = x;
         this.y = y;
         this.facing = facing;
         return DONE_PLACED;
      }
   }
   turn(side) {
      this.facing = (this.facing + 4 + side) % 4;
      return DONE_TURNED;
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
         return WARNING_POS_INVALID;
      } else if (this.space.isPosOccupied(x, y)) {
         return WARNING_POS_OCCUPIED;
      } else {
         this.space.vacate(this.x, this.y);
         this.space.occupy(this, x, y);
         this.x = x;
         this.y = y;
         return DONE_MOVED;
      }
   }
}
class Table extends Space2D {
   constructor(sizeX, sizeY) {
      super(sizeX, sizeY);
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
class Executor {
   execute(table, commands, multiple = false) {
      let result = {},
          robo = table.activeRobot,
          matches;
      
      const arr = commands.split('\n');
      for (let cmd of arr) {
         
         cmd = cmd.trim().toUpperCase();
         
         result.command = cmd;
         result.robot = robo;
         result.value = COMMAND_IGNORED;
         
         if (matches = cmd.match(/^ROBOT[ ]+(\d+)/)) {
            if (table.chooseRobot(Number(matches[1]))) {
               robo = table.activeRobot;
               result.robot = robo;
               result.value = DONE_ACTIVATED;
            } else {
               result.value = ERROR_NOT_ON_TABLE;
            }
            result.command = 'ROBOT';
            result.params = matches[1];
         } else if (matches = cmd.match(/^PLACE[ ]+(\d+)[ ]*,\s*(\d+)\s*,\s*(NORTH|SOUTH|EAST|WEST)/)) {
            let x = Number(matches[1]),
                y = Number(matches[2]), 
                facing = 'NESW'.indexOf(matches[3].substr(0, 1));
            if (!table.isPosValid(x, y)) {
               result.value = WARNING_POS_INVALID;
            } else if (table.isPosOccupied(x, y)) {
               result.value = WARNING_POS_OCCUPIED;
            } else {
               if (!robo) {                        
                  // if there is no robot on the table, put a new one and activated it.
                  robo = table.addRobot(x, y, facing);
                  result.robot = robo;
                  result.value = DONE_PLACED_ACTIVE;
               } else if (multiple) {
                  // if there are robots on the table and System is in Multiple Mode, put a new one without activating it.
                  result.robot = table.addRobot(x, y, facing);
                  result.value = DONE_PLACED;
               } else {
                  // if there are robots on the table and System is in Single Mode, relocate the active robot.
                  robo.place(x, y, facing);
                  result.value = DONE_RELOCATED;
               }
            }
            result.command = 'PLACE';
            result.params = `${x},${y}`;
         } else if (!robo) {
            result.value = ERROR_NO_ACTIVE_ROBOT;
         } else if (cmd == 'LEFT') {
            result.value = robo.turn(-1);
         } else if (cmd == 'RIGHT') {
            result.value = robo.turn(1);
         } else if (cmd == 'MOVE') {
            let target = {};
            result.value = robo.move(target);
            result.params = `${target.x},${target.y}`;
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
            this.excuted(result);
         }
      }
   }
   generateRandomCommands(space) {
      let randomInt = (max) => Math.floor(max * Math.random());

      let randomPlace = () => {
         return {
            x: randomInt(space.sizeX),
            y: randomInt(space.sizeY),
            facing: DIRECTION_WORDS[randomInt(4)]
         }
      }
      
      let commands = [];
      
      let place = randomPlace();
      commands.push(`PLACE ${place.x},${place.y},${place.facing}`);
      
      for (let i = 0; i < 10; i++) {
         let iTurn = randomInt(3) - 1;
         if (iTurn < 0) {
            commands.push('LEFT');
         } else if (iTurn > 0) {
            commands.push('RIGHT');
         }
         
         if (Math.random() > 0.5) {
            commands.push('MOVE');
         }
         
         if (Math.random() > 0.9) {
            let place = randomPlace();
            commands.push(`PLACE ${place.x},${place.y},${place.facing}`);
         }
      }
      
      commands.push('REPORT');
      
      return commands.join('\n');
   }
}

export { Space2D, Robot, Table, Executor };
