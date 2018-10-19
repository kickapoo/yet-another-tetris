/*
* BaseCase Programming Test, A Tetris Game
* Anastasiadis Stavros (anastasiadis.st00@gmail.com)
* 17/10/2018
*/

// Each Cell Factory
const cellFactory = {
  clear: function(){
    this.used = 0;
    this.color = 'white';
  },
  create: function(){
      let cell= Object.create(this);
      cell.used = 0;
      cell.color = 'white';
      return cell;
  }
};

function chunkArray(array1D, size=1){
  var clone = array1D.slice(0);
  var arrayIn2D = [];
  while (clone.length>0)
    arrayIn2D.push(clone.splice(0,size));
  return arrayIn2D;
};

// The Tetris pieces
const TetrisPieces = {
  shape: function() {
    return this.masks[this.rotation]
  },
  binary16 : function() {
    return ('0000000000000000' + this.shape().toString(2) ).slice(-16).split('');
  },
  array44: function() {
    return chunkArray(this.binary16(), 4)
  },
  random_start_position: function() {
    return Math.floor(Math.random() * 15) + 1
  },
  templates: [
    { name:'I', masks : [0x4444, 0x0f00, 0x4444, 0x0f00], rotation : 0, color : 'aqua', r : -3, c: Math.floor(Math.random() * 19) + 1, rLast: null, cLast : null },
    { name:'O', masks : [0x0660, 0x0660, 0x0660, 0x0660], rotation : 0, color : 'yellow', r : -2, c: Math.floor(Math.random() * 19) + 1, rLast: null, cLast : null },
    { name:'J', masks : [0x2260, 0x08e0, 0x6440, 0x0710], rotation : 0, color : 'blue', r : -2, c: Math.floor(Math.random() * 19) + 1, rLast: null, cLast : null },
    { name:'L', masks : [0x4460, 0x0e80, 0x6220, 0x02e0], rotation : 0, color : 'orange', r : -2, c: Math.floor(Math.random() * 19) + 1, rLast: null, cLast : null },
    { name:'S', masks : [0x0360, 0x2310, 0x0360, 0x2310], rotation : 0, color : 'lawngreen', r : -2, c: Math.floor(Math.random() * 19) + 1, rLast: null, cLast : null },
  ],
  create: function(){
    let random = Math.random() * this.templates.length;
    let values = this.templates[Math.floor(random)];
    let instance = Object.create(this);
    Object.keys(values).forEach(function (key) {
      instance[key] = values[key];
    });
    return instance;
  }
};


var app = new Vue({
	el: '#app',
	data: {
    pause: false,
    maxBoardCells: 400,
    maxBoardRows: 18,
    allCells: [],
    board: [],
    score: 0,
    tetrisPiece: TetrisPieces.create(),
    tetrisPieceNext: TetrisPieces.create(),
    intervalID: 0,
    step_idx:0,
    isGameOver: false,
    successLinesNum: 0,
	},
  computed: {
    checkGameStatus: function() {
      return !this.pieceCanStillFall && this.tetrisPiece.r < 0;
    },
    pieceCanStillFall: function() {
      var shape = this.tetrisPiece.shape();
      var {r,c} = this.tetrisPiece;
      var space = this.checkWallLimits(r+1, c,  1);
      return (shape & space) == 0;
    },
    pieceCanGoLeft: function()  {
      var shape = this.tetrisPiece.shape();
      var {r,c} = this.tetrisPiece;
      var space = this.checkWallLimits(r,c-1, 1);
      return (shape & space) == 0;
    },
    pieceCanGoRight: function () {
      var shape = this.tetrisPiece.shape();
      var {r,c} = this.tetrisPiece;
      var space = this.checkWallLimits(r, c+1, 1);
      return  (shape & space) == 0;
    },
  },
  methods: {
    restartGame: function(){
      this.allCells = []
      this.board = []
      this.allCells = new Array(this.maxBoardCells).fill().map(i=>cellFactory.create())
      for (let i = 0; i < this.maxBoardRows; i++) {
        this.board.push(this.allCells.slice(i * this.maxBoardRows, i * this.maxBoardRows + this.maxBoardRows));
      }
      this.tetrisPiece = this.tetrisPieceNext;
      this.tetrisPieceNext = TetrisPieces.create();
      this.startGame()
    },
    startGame: function(){
      this.isGameOver = false; // in case of restart
      this.pause = false; // in case of restart
      this.successLines = 0;
      this.score = 0;

      // Each piece falls in by setting an interval of 50 mmsec;
      // clear if previous interval if exist like restart
      if (this.intervalID > 0) {
        clearInterval(this.intervalID);
      }
      this.step_idx = 1;
      this.intervalID = setInterval(this.stepPiece, 50)
    },
    stepPiece: function(){
      /// check step_idx
      if (this.step_idx++ % 10 != 0) {
        return;
      }
      if (this.pause) {
          return;
      }
      if (this.pieceCanStillFall) {
        this.pieceIsFailing();
      } else {
        if (this.checkGameStatus) {
            this.isGameOver = true;
            this.pause = true;
            return;
        }
        this.freezetetrisPiece();
        this.tetrisPiece = this.tetrisPieceNext;
        this.tetrisPieceNext = TetrisPieces.create();
        this.checkLineSuccess();
        this.score += 3;
      }
    },
    pieceIsFailing: function(){
      this.undrawCells();
      this.tetrisPiece.r = this.tetrisPiece.r + 1;
      this.drawCells();
    },
    drawCells: function () {
      var {r, c, rLast, cLast, masks } = this.tetrisPiece;
      this.tetrisPiece.rLast = r;
      this.tetrisPiece.cLast = c;
      this.updateRowStatus(r,c,1);
    },
    undrawCells: function () {
      var {r,c,rLast, cLast, masks} = this.tetrisPiece;
      if (rLast == null) return;
      this.updateRowStatus(rLast, cLast, 0);
    },
    updateRowStatus: function (r, c, value) {
      var a44 = chunkArray(this.tetrisPiece.binary16(), 4);
      for(i = 0; i < 4; i++){
        var r2 = r + i;
        if (r2 < 0 || r2 > this.maxBoardRows - 1) {
          continue;
        }
        for( j =0; j< 4; j++){
          var c2 = c+j;
          if(c2<0 || c2>this.maxBoardRows -  1) continue;
          if(a44[i][j] == 1){
            this.board[r2][c2].used = value;
            this.board[r2][c2].color= value==0 ? 'white': this.tetrisPiece.color;
          }
        }
      }
    },
    freezetetrisPiece: function(){
      var {r,c,rLast, cLast, masks} = this.tetrisPiece;
      this.updateRowStatus(rLast, cLast, 2);
    },
    pauseGame: function(){
      this.pause = !this.pause;
    },
    checkLineSuccess: function() {
        var fulls = this.board.filter(r=> r.every(i=>i.used > 0));

        fulls.forEach(r => {
          this.score += 12;
          this.successLinesNum += 1;
          this.board.splice(this.board.indexOf(r), 1);
          this.board.unshift(new Array(this.maxBoardRows).fill().map(i=>({ used: 0 })));
        });
      },
    checkWallLimits: function (r=0, c=0, level=0){
      var rtn = new Array(4).fill();
        for(let i = 0;i < 4; i++){
          var rowString = (i+r) > this.maxBoardRows - 1 ? '1111111111111111': (i+r)<0 ? '0000000000' : this.board[i+r].map(c => c.used > level ? 1:0).join('');
          var s18 = '1111' + rowString +'1111' //18
          rtn[i] = s18.slice(c+4,c+4+4).split('');
        }
        var s = rtn.map(i=>i.join('')).join('');
        return parseInt(s,2);
    },
    keyHandle: function (e) {
      switch (e.key) {
        case "ArrowUp":
          this.undrawCells();
          this.tetrisPiece.rotation  = (this.tetrisPiece.rotation + 1) % 4;
          this.drawCells();
          break;
        case "ArrowLeft":
          if (!this.pieceCanGoLeft) {
              return;
          }
          this.tetrisPiece.c -= 1;
          this.undrawCells();
          this.drawCells();
          break;
        case "ArrowRight":
          if (!this.pieceCanGoRight) {
            return
          }
          this.tetrisPiece.c += 1;
          this.undrawCells();
          this.drawCells();
          break;
        case "ArrowDown":
          if (!this.pieceCanStillFall) {
            return;
          }
          this.tetrisPiece.r += 1;
          this.undrawCells();
          this.drawCells();
          break;
        default:
          console.log(e.key);
          break;
      }
    }
  },
  created: function () {
    window.addEventListener('keydown', this.keyHandle)
  },
  beforeMount: function(){
    this.restartGame();
  }
})
