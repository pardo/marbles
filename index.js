import './style.css'

function FisherYatesShuffle (myArray) {
  var i = myArray.length
  var j
  var tempi
  var tempj
  if (i === 0) return false
  while (--i) {
    j = Math.floor(Math.random() * (i + 1))
    tempi = myArray[i]
    tempj = myArray[j]
    myArray[i] = tempj
    myArray[j] = tempi
  }
  return myArray
}

// extracted from underscore
function debounce (func, wait, immediate) {
  var timeout
  var result
  return function () {
    var context = this
    var args = arguments
    var later = function () {
      timeout = null
      if (!immediate) result = func.apply(context, args)
    }
    var callNow = immediate && !timeout
    clearTimeout(timeout)
    timeout = setTimeout(later, wait)
    if (callNow) result = func.apply(context, args)
    return result
  }
}

function throttle (func, wait) {
  var context
  var args
  var timeout
  var throttling
  var more
  var result
  var whenDone = debounce(function () { more = throttling = false }, wait)
  return function () {
    context = this
    args = arguments
    var later = function () {
      timeout = null
      if (more) func.apply(context, args)
      whenDone()
    }
    if (!timeout) timeout = setTimeout(later, wait)
    if (throttling) {
      more = true
    } else {
      result = func.apply(context, args)
    }
    whenDone()
    throttling = true
    return result
  }
}

function TemporalFlags () {
  this.timeouts = {}
  this.flags = {}

  this.getFlag = function (flag) {
    return this.flags[flag]
  }

  this.addTemporalFlag = function (flag, timeoutInMillisecons, callback) {
    window.clearTimeout(this.timeouts[flag])
    this.flags[flag] = new Date()
    this.timeouts[flag] = setTimeout(() => {
      var elapsed = (new Date().getTime()) - this.flags[flag]
      this.flags[flag] = false
      callback(elapsed)
    }, timeoutInMillisecons)
  }

  this.removeTemporalFlag = function (flag) {
    window.clearTimeout(this.timeouts[flag])
    this.flags[flag] = false
  }

  this.addTemporalProperty = function (name, timeoutInMillisecons, callback) {
    callback = callback === undefined ? () => {} : callback
    // name will be used to construct setter and getter
    this[`is${name}`] = () => {
      return this.getFlag(name)
    }
    this[`set${name}`] = (timeoutOverrride) => {
      timeoutOverrride = timeoutOverrride !== undefined ? timeoutOverrride : timeoutInMillisecons
      return this.addTemporalFlag(name, timeoutOverrride, callback)
    }
    this[`unset${name}`] = () => {
      this.removeTemporalFlag(name)
    }
  }
}

function PointsTracker (sendMarblesCallback) {
  this.setMarbleMultiplier = function (type) {
    if (type === undefined) {
      this.marbleMultiplierType = ['d', 'r', 'g', 'o', 'b'][Math.floor(Math.random() * 5)]
    } else {
      this.marbleMultiplierType = type
    }
    this.marbleMultiplier = 1
    console.log(`Multiplier: ${this.marbleMultiplierType}`)
  }

  this.trackRemoved = function (removedAmount, marbleType) {
    let elapsed = (new Date()).getTime() - this.lastRemoveAt
    this.lastRemoveAt = (new Date()).getTime()
    this.points.push(
      [removedAmount, marbleType, this.lastRemoveAt, elapsed]
    )

    if (marbleType === this.marbleMultiplierType) {
      this.marbleMultiplier += 1
      // if removed the marble multiplier color then send 3
    }

    if (elapsed > 200) {
      this.combo = 0
    } else {
      this.combo += 1
    }

    if (removedAmount === 5) {
      this.sendMarblesLoop()
      this.setMarbleMultiplier(marbleType)
      return
    }

    var isMultiplierType = marbleType === this.marbleMultiplierType
    var baseAmount = 1
    if (removedAmount === 3) {
      if (isMultiplierType) {
        baseAmount = 3
      } else {
        baseAmount = 1
      }
    } else if (removedAmount === 4) {
      if (isMultiplierType) {
        baseAmount = 4
      } else {
        baseAmount = 2
      }
    }
    return this.sendMarbles(baseAmount + this.combo * 2)
  }

  this.sendMarblesLoop = function () {
    console.log(`Do Loop: ${this.marbleMultiplier}`)
    for (let i = 1; i <= this.marbleMultiplier; i++) {
      setTimeout(() => {
        this.sendMarbles(3)
      }, i * 1000)
    }
  }

  this.sendMarbles = function (amount) {
    console.log(`Sending: ${amount}`)
    this.sendMarblesCallback(amount)
  }

  this.setMarbleMultiplier()
  this.combo = 0
  this.lastRemoveAt = (new Date()).getTime()
  this.points = []
  this.sendMarblesCallback = sendMarblesCallback
}

function Marble (type) {
  this.type = type
  this.isEmpty = type === 'x'
  this.isNew = true
  this.addedFromTop = false
  setTimeout(() => {
    this.isNew = false
  }, 550)

  this.tf = new TemporalFlags()
  this.tf.addTemporalProperty('TranslatingRight', 90)
  this.tf.addTemporalProperty('MovingDown', 110)
  this.tf.addTemporalProperty('MovingUp', 110)
}

function Game () {
  this.initialize = function (container, scoreContainer) {
    this.container = container
    this.scoreContainer = scoreContainer
    this.pointsTracker = new PointsTracker((amount) => {
      this.sendMarbles(amount)
    })
    this.temporalFlags = new TemporalFlags()
    // animation lock system
    this.temporalFlags.addTemporalProperty('Locked', 130, (elapsed) => {
      this.resetAnimations()
    })
    // 7 1 7
    // from left to right
    // from bottom to top
    this.columnSize = 15 // must be odd
    this.center = Math.floor(15 / 2)
    this.cursor = 2 // column index
    this.columns = [
      // 0
      this.getEmptyColumn(this.columnSize),
      // 1
      this.getEmptyColumn(this.columnSize),
      // 2
      this.getEmptyColumn(this.columnSize),
      // 3
      this.getEmptyColumn(this.columnSize),
      // 4
      this.getEmptyColumn(this.columnSize)
    ]
    /*
    for (let i = 0; i < 5; i++) {
      this.addMarbleFromBottom(this.getRandomMarble(), i)
      this.addMarbleFromTop(new Marble('r'), i)
      this.addMarbleFromTop(new Marble('g'), i)
      this.addMarbleFromTop(new Marble('b'), i)
      this.addMarbleFromTop(new Marble('d'), i)
      this.addMarbleFromTop(new Marble('r'), i)
      this.addMarbleFromTop(new Marble('g'), i)
      this.addMarbleFromTop(new Marble('b'), i)
      this.addMarbleFromTop(new Marble('d'), i)
    }
    */
    this.fillColumns()
    // this marble type will get a bonus
    this.createDom()
  }

  this.sendMarbles = function (amount) {
    this.otherGame.receiveMarbles(amount)
  }

  this.receiveMarbles = function (amount) {
    this.attachReceiveMarble(amount)
    this.addRandomMarbles(amount)
  }

  this.setOtherPlayerGame = function (game) {
    this.otherGame = game
  }

  this.getEmptyColumn = function (size) {
    var column = []
    for (var i = 0; i < size; i++) {
      column.push(
        new Marble('x')
      )
    }
    return column
  }

  this.getTopSectionOfColumn = function (columnIndex, includeCenter) {
    if (includeCenter) {
      return this.columns[columnIndex].slice(this.center)
    } else {
      return this.columns[columnIndex].slice(this.center + 1)
    }
  }

  this.getBottomSectionOfcolumn = function (columnIndex, includeCenter) {
    if (includeCenter) {
      return this.columns[columnIndex].slice(0, this.center + 1)
    } else {
      return this.columns[columnIndex].slice(0, this.center)
    }
  }

  this.getNumberOfMarblesInTopSection = function (columnIndex) {
    // doesn't includes the center one
    // count x in the top part then substract to the total number of element on the half
    return this.center - this.getTopSectionOfColumn(columnIndex).filter((marble) => {
      return marble.isEmpty
    }).length
  }

  this.getNumberOfMarblesInBottomSection = function (columnIndex) {
    // doesn't includes the center one
    // count x in the bottom part then substract to the total number of element on the half
    return this.center - this.getBottomSectionOfcolumn(columnIndex).filter((marble) => {
      return marble.isEmpty
    }).length
  }

  this.getNumberOfMarblesInColumn = function (columnIndex) {
    return this.columnSize - this.columns[columnIndex].filter((marble) => {
      return marble.isEmpty
    }).length
  }

  this.fillColumn = function (columnIndex) {
    this.temporalFlags.setLocked()
    let marblesInColumn = this.getNumberOfMarblesInColumn(columnIndex)
    if (marblesInColumn >= 5) { return }
    // always try to have the same amount at top and the bototm
    // the top part of the column
    // because we could add up 2 substract the number of marbles
    var shouldAdd = 5 - marblesInColumn
    var mts = this.getNumberOfMarblesInTopSection(columnIndex)
    var mbs = this.getNumberOfMarblesInBottomSection(columnIndex)

    if (mts < mbs) {
      this.addRandomMarbles(1, columnIndex, true)
    } else {
      this.addRandomMarbles(1, columnIndex, false)
    }
    if (shouldAdd > 1) {
      this.fillColumn(columnIndex)
    }
  }

  this.fillColumns = function () {
    for (let col = 0; col < 5; col++) {
      this.fillColumn(col)
    }
  }

  this.addRandomMarbles = function (amount, columnIndex, addFromTop) {
    var col
    if (columnIndex === undefined) {
      // randomly adding marbles
      var columnsIndexes = FisherYatesShuffle([
        0, 1, 2, 3, 4,
        0, 1, 2, 3, 4,
        0, 1, 2, 3, 4
      ]) // up to 3 marbles per column

      while (amount > 0 && columnsIndexes.length > 0) {
        col = columnsIndexes.pop()
        let fromTop = addFromTop === undefined ? Math.random() > 0.5 : addFromTop
        let addedMarble = false
        if (fromTop) {
          addedMarble = this.addMarbleFromTop(this.getRandomMarble(), col)
        } else {
          addedMarble = this.addMarbleFromBottom(this.getRandomMarble(), col)
        }
        // couldn't add in the requested order try the inverse
        if (!addedMarble && fromTop) {
          addedMarble = this.addMarbleFromBottom(this.getRandomMarble(), col)
        } else if (!addedMarble && fromTop) {
          addedMarble = this.addMarbleFromTop(this.getRandomMarble(), col)
        }

        if (addedMarble) {
          amount -= 1
        }
      }
    } else {
      // add marbles to the same column multiple times
      for (let i = 0; i < amount; i++) {
        var fromTop = addFromTop === undefined ? Math.random() > 0.5 : addFromTop
        if (fromTop) {
          this.addMarbleFromTop(this.getRandomMarble(), columnIndex)
        } else {
          this.addMarbleFromBottom(this.getRandomMarble(), columnIndex)
        }
      }
    }
  }

  this.getRandomMarbles = function (amount) {
    var m = []
    for (var i = 0; i < amount; i++) {
      m.push(this.getRandomMarble())
    }
    return m
  }

  this.getRandomMarble = function () {
    let type = ['d', 'r', 'g', 'o', 'b'][Math.floor(Math.random() * 5)]
    return new Marble(type)
  }

  this.checkForEquals = function (howMany, startingAt) {
    // return true if we have x amount to equals at that point
    for (let i = startingAt; i < howMany + startingAt - 1; i++) {
      if (this.columns[i][this.center].type !== this.columns[i + 1][this.center].type) {
        return false
      }
    }
    return true
  }

  this.removeMarbles = function (howManyColumns, startingAtColumn) {
    this.pointsTracker.trackRemoved(
      howManyColumns,
      this.columns[startingAtColumn][this.center].type
    )
    this.temporalFlags.setLocked()
    for (let columnIndex = startingAtColumn; columnIndex < howManyColumns + startingAtColumn; columnIndex++) {
      const column = this.columns[columnIndex]
      column.splice(this.center, 1)
      // after removing a marble we know that we can safety add an empty space
      column.push(new Marble('x'))
      if (column[this.center].isEmpty) {
        // the middle is empty after moving everything down
        // move everythign up by one
        column.unshift(new Marble('x'))
        column.pop()
        this.getBottomSectionOfcolumn(columnIndex, true).forEach((marble) => {
          marble.tf.setMovingUp()
        })
      } else {
        // all the marbles in the top porting should animate down
        this.getTopSectionOfColumn(columnIndex, true).forEach((marble) => {
          marble.tf.setMovingDown()
        })
      }
    }
    this.fillColumns()
    return true
  }

  this.translateCenterRight = function () {
    if (this.temporalFlags.isLocked()) {
      return
    }
    this.temporalFlags.setLocked()
    // used to trigger the animation as soon as posible
    var lastMarble = this.columns[4][this.center]
    for (let columnIndex = 4; columnIndex > 0; columnIndex--) {
      // could use swapping this.swapCenterMarbles
      this.columns[columnIndex][this.center] = this.columns[columnIndex - 1][this.center]
      this.columns[columnIndex][this.center].tf.setTranslatingRight()
    }
    this.columns[0][this.center] = lastMarble
    this.columns[0][this.center].tf.setTranslatingRight()
    this.checkCenterMarbles()
  }

  this._checkAndRemove = function () {
    if (this.checkForEquals(5, 0)) {
      return this.removeMarbles(5, 0)
    }
    if (this.checkForEquals(4, 0)) {
      return this.removeMarbles(4, 0)
    }
    if (this.checkForEquals(4, 1)) {
      return this.removeMarbles(4, 1)
    }
    if (this.checkForEquals(3, 0)) {
      return this.removeMarbles(3, 0)
    }
    if (this.checkForEquals(3, 1)) {
      return this.removeMarbles(3, 1)
    }
    if (this.checkForEquals(3, 2)) {
      return this.removeMarbles(3, 2)
    }
    return false
  }

  this.checkCenterMarbles = function () {
    if (this.temporalFlags.isLocked()) {
      setTimeout(() => { this.checkCenterMarbles() }, 140)
      return
    }
    // check marbles for lines
    if (this._checkAndRemove()) {
      // after removing an element lock
      this.temporalFlags.setLocked()
      setTimeout(() => { this.checkCenterMarbles() }, 140)
    }
  }

  this.addMarbleFromTop = function (marble, columnIndex) {
    this.temporalFlags.setLocked()
    marble.tf.setMovingDown()
    var added = false
    var column = this.columns[columnIndex]
    for (let i = this.center; i < column.length; i++) {
      if (column[i].isEmpty && !added) {
        added = true
        column[i] = marble
      }
      // after adding mark all the marbles as moving
      // this is only for visual effects
      if (added) {
        column[i].tf.setMovingDown()
      }
    }
    return added
  }

  this.addMarbleFromBottom = function (marble, columnIndex) {
    this.temporalFlags.setLocked()
    marble.tf.setMovingUp()
    var added = false
    var column = this.columns[columnIndex]
    for (let i = this.center; i >= 0; i--) {
      if (column[i].isEmpty && !added) {
        added = true
        column[i] = marble
      }
      // after adding mark all the marbles as moving
      // this is only for visual effects
      if (added) {
        column[i].tf.setMovingUp()
      }
    }
    return added
  }

  this.doGravity = function (columnIndex) {
    var marble = this.columns[columnIndex][this.center]
    if (!marble.isEmpty) {
      // no need to apply gravity as the center is not empty
      return
    }
    // the middle is empty after doing something
    // remove the empty slot
    this.removeMarbles(1, columnIndex)
  }

  this.swapCenterMarbles = function (colA, colB) {
    let A = this.columns[colA][this.center]
    let B = this.columns[colB][this.center]
    if (A.isEmpty && B.isEmpty) {
      return
    }
    // do the swap
    this.columns[colA][this.center] = B
    this.columns[colB][this.center] = A
    // check either A or B is empty and move up and down as needed
    this.doGravity(colA)
    this.doGravity(colB)
  }

  this.left = function (dragMarble) {
    // move cursor
    let oldCursor = this.cursor
    this.cursor -= 1
    this.cursor = Math.max(this.cursor, 0)
    if (dragMarble) {
      this.swapCenterMarbles(oldCursor, this.cursor)
    }
    this.checkCenterMarbles()
  }
  this.right = function (dragMarble) {
    // move cursor
    let oldCursor = this.cursor
    this.cursor += 1
    this.cursor = Math.min(this.cursor, 4)
    if (dragMarble) {
      this.swapCenterMarbles(oldCursor, this.cursor)
    }
    this.checkCenterMarbles()
  }
  this.down = function () {
    if (this.temporalFlags.isLocked()) {
      return
    }
    // check we have space at the bottom to move everything
    if (!this.columns[this.cursor][0].isEmpty) {
      console.log('Doesn\'t have space at bottom')
      return
    }
    // check if the following item to the center is not an empty space
    if (this.columns[this.cursor][this.center + 1].isEmpty) {
      console.log('No marble to move into the center')
      return
    }
    let column = this.columns[this.cursor]
    let marble = new Marble('x')
    column.push(marble)
    column.shift()
    column.forEach((marble) => {
      marble.tf.setMovingDown()
    })
    this.temporalFlags.setLocked()
    this.checkCenterMarbles()
  }

  this.up = function () {
    if (this.temporalFlags.isLocked()) {
      return
    }
    // check we have space on the top to move everything
    if (!this.columns[this.cursor][this.columnSize - 1].isEmpty) {
      console.log('Doesn\'t have space at top')
      return
    }
    // check if the following item to the center is not an empty space
    if (this.columns[this.cursor][this.center - 1].isEmpty) {
      console.log('No marble to move into the center')
      return
    }
    let column = this.columns[this.cursor]
    column.unshift(new Marble('x'))
    column.pop()
    column.forEach((marble) => {
      marble.tf.setMovingUp()
    })
    this.temporalFlags.setLocked()
    this.checkCenterMarbles()
  }

  // dom related

  this.resetAnimations = function () {
    this.columnsDom.forEach((column) => {
      column.forEach((element) => {
        element.classList.remove('translate-right')
        element.classList.remove('moving-up')
        element.classList.remove('moving-down')
        void element.offsetWidth
      })
    })
    this.draw()
  }

  this.setMarbleClasses = function (marble, element) {
    if (!element.classList.contains(marble.type)) {
      ['x', 'd', 'r', 'g', 'o', 'b'].forEach((c) => {
        element.classList.remove(c)
      })
      element.classList.add(marble.type)
    }
    if (marble.tf.isTranslatingRight()) {
      element.classList.add('translate-right')
      element.classList.remove('moving-down')
      element.classList.remove('moving-up')
    } else if (marble.tf.isMovingDown()) {
      element.classList.add('moving-down')
      element.classList.remove('translate-right')
      element.classList.remove('moving-up')
    } else if (marble.tf.isMovingUp()) {
      element.classList.add('moving-up')
      element.classList.remove('translate-right')
      element.classList.remove('moving-down')
    } else {
      element.classList.remove('moving-up')
      element.classList.remove('moving-down')
      element.classList.remove('translate-right')
    }
  }

  this.drawMarble = function (marble, columnIndex, marbleIndex) {
    let element = this.columnsDom[columnIndex][marbleIndex]
    this.setMarbleClasses(marble, element)
    if (marbleIndex === this.center) {
      if (columnIndex === this.cursor) {
        this.cursorDom[columnIndex].classList.add('cursor')
      } else {
        this.cursorDom[columnIndex].classList.remove('cursor')
      }
    }
  }

  this.draw = function () {
    this.columns.forEach((column, columnIndex) => {
      column.forEach((marble, marbleIndex) => {
        this.drawMarble(marble, columnIndex, marbleIndex)
      })
    })
    this.setMarbleClasses(
      new Marble(this.pointsTracker.marbleMultiplierType),
      this.marbleMultiplierDom
    )
    this.marbleMultiplierDom.innerText = this.pointsTracker.marbleMultiplier
  }

  this.throttledDraw = throttle(() => {
    this.draw()
  }, 10)

  this.createRowElement = function (parent, isCenter) {
    let element = document.createElement('div')
    if (isCenter) {
      element.className = 'row center'
    } else {
      element.className = 'row'
    }
    parent.appendChild(element)
    return element
  }

  this.createMarbleElement = function (parent) {
    let element = document.createElement('div')
    element.className = 'marble'
    if (parent) {
      parent.appendChild(element)
    }
    return element
  }

  this.bindAnimationLock = function (element, columnIndex, marbleIndex) {
    element.addEventListener('animationstart', (e) => {
      if (e.animationName === 'moving-down' || e.animationName === 'moving-up' || e.animationName === 'translate-right') {
        this.temporalFlags.setLocked()
      }
    })
  }

  this.attachReceiveMarble = function (amount) {
    let element = document.createElement('div')
    element.innerText = `${amount}x`
    element.addEventListener('animationend', (e) => {
      element.remove()
    })
    this.receiveDom.prepend(element)
  }

  this.createDom = function () {
    this.receiveDom = this.scoreContainer.getElementsByClassName('receive')[0]
    this.marbleMultiplierDom = this.scoreContainer.getElementsByClassName('marble')[0]
    this.cursorDom = []
    this.columnsDom = [
      Array(this.columnSize),
      Array(this.columnSize),
      Array(this.columnSize),
      Array(this.columnSize),
      Array(this.columnSize)
    ]
    for (let marbleIndex = this.columnSize - 1; marbleIndex >= 0; marbleIndex--) {
      var row = this.createRowElement(this.container)
      var element
      for (let columnIndex = 0; columnIndex < 5; columnIndex++) {
        element = this.createMarbleElement(row)
        this.columnsDom[columnIndex][marbleIndex] = element
        this.bindAnimationLock(element, columnIndex, marbleIndex)
      }
      if (marbleIndex === this.center) {
        row = this.createRowElement(this.container, true)
        for (let columnIndex = 0; columnIndex < 5; columnIndex++) {
          this.cursorDom[columnIndex] = this.createMarbleElement(row)
        }
      }
    }
  }
}

let gameP1 = new Game()
let gameP2 = new Game()

gameP1.setOtherPlayerGame(gameP2)
gameP2.setOtherPlayerGame(gameP1)

window.addEventListener('keydown', (e) => {
  switch (e.which) {
    case 37:
      // 37 left
      gameP2.left()
      break
    case 38:
      // 38 up
      gameP2.up()
      break
    case 39:
      // 39 right
      gameP2.right()
      break
    case 40:
      // 40 down
      gameP2.down()
      break
    case 76:
      // L
      gameP2.translateCenterRight()
      break

    // Player on the left
    case 83:
      // S left
      gameP1.left()
      break
    case 69:
      // E up
      gameP1.up()
      break
    case 70:
      // F right
      gameP1.right()
      break
    case 68:
      // D down
      gameP1.down()
      break
    case 81:
      // Q
      gameP1.translateCenterRight()
      break
    default:
      console.log(e.which)
  }
})

window.addEventListener('load', function () {
  gameP1.initialize(
    document.getElementById('p1'),
    document.getElementById('p1-score')
  )
  gameP2.initialize(
    document.getElementById('p2'),
    document.getElementById('p2-score')
  )
  setInterval(() => {
    gameP1.checkCenterMarbles()
    gameP2.checkCenterMarbles()
    gameP1.draw()
    gameP2.draw()
  }, 20)
})

console.log(`
The keys are for the player on the left
Up and Down with "e" "d"
Move Cursor Left and right with "s" "f"
Rotate Center with "q"

The keys are for the player on the right
Arrow Keys for movement
Rotate Center with "l"

`)

export default gameP1
