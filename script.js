document.addEventListener("DOMContentLoaded", () => {
   const ELV_A = new Elevator("A", -1, 9)
   const ELV_B = new Elevator("B", 0, 10)

   // grab all elevator buttons
   let buttons = document.getElementsByClassName("floor-button")

   for (const button of buttons) {
      button.addEventListener("click", (e) => {
         e.preventDefault();
         let elv = button.dataset.elevator
         let flr = button.dataset.floor
         let dir = button.dataset.hasOwnProperty("direction") ? button.dataset.direction : false
         let status = elv === "A" ? ELV_A.call(flr, dir) : ELV_B.call(flr, dir)
         status === true ? button.classList.add("selected") : null
      })
   }

   let runA = document.getElementById("Arun")
   let pauseA = document.getElementById("Apause")
   let runB = document.getElementById("Brun")
   let pauseB = document.getElementById("Bpause")

   runA.addEventListener("click", () => {
      ELV_A.run()
      runA.classList.add("running")
      pauseA.classList.remove("paused")
   })
   pauseA.addEventListener("click", () => {
      if (ELV_A.isPaused === false) {
         ELV_A.pause()
         pauseA.classList.add("paused")
         runA.classList.remove("running")
      }
   })
   runB.addEventListener("click", () => {
      ELV_B.run()
      runB.classList.add("running")
      pauseB.classList.remove("paused")
   })
   pauseB.addEventListener("click", () => {
      if (ELV_B.isPaused === false) {
         ELV_B.pause()
         pauseB.classList.add("paused")
         runB.classList.remove("running")
      }
   })
})

function updateCurrent(elv, floor) {
   let buttonParentDiv = document.getElementById(`${elv}${floor}`)
   let buttonButton = document.getElementById(`${elv}${floor}button`)
   buttonParentDiv.classList.add("current")
   buttonButton.classList.add("current-button")

   let previousSibling = buttonParentDiv.previousElementSibling
   let nextSibling = buttonParentDiv.nextElementSibling
   if (previousSibling) {
      previousSibling.classList.remove("current")
      document.getElementById(`${elv}${floor + 1}button`).classList.remove("current-button")
   }
   if (nextSibling) {
      nextSibling.classList.remove("current")
      document.getElementById(`${elv}${floor - 1}button`).classList.remove("current-button")
   }
}

// log status to the elevator log window
function addToLogs(elvName, msg, props = {}) {
   let table = document.getElementById(`elv${elvName}Logs`)
   table.innerHTML += `<tr>
              	           <td class="log-indicator">&rArr;</td>
              	           <td class="log-status">${msg}</td>
 	    	              </tr>`
   if (Object.keys(props).length !== 0) {
      for (const p in props) {
         table.lastChild.firstElementChild.firstElementChild.style[p] = props[p]
         table.lastChild.firstElementChild.lastElementChild.style[p] = props[p]
      }
   }
   table.parentNode.scrollTop += table.parentNode.scrollHeight;
}

class Elevator {
   constructor(name, minFloor, maxFloor) {
      this.name = name
      this.minFloor = minFloor
      this.maxFloor = maxFloor

      this.queue = {
         "up": new Set(),
         "down": new Set(),
         "upNext": null,
         "downNext": null
      }

      this.queueDirection = null
      this.elevatorDirection = null

      this.isMoving = false
      this.isPaused = false
      this.destinationFloor = null
      this.currentFloor = (this.minFloor <= 0) ? 0 : this.minFloor
      updateCurrent(this.name, this.currentFloor)
      this.interval = false
   }

   call(floor, direction = false) {
      // 1. Direction is not provided
      if (!direction) {
         // The elevator is on standby
         if (!this.isMoving) {
            // The floor is above the currentFloor
            if (floor > this.currentFloor) {
               direction = "up"

               // The floor is below the currentFloor
            } else if (floor < this.currentFloor) {
               direction = "down"

               // The floor is the currentFloor
            } else {
               return addToLogs(this.name, `The elevator is already at ${florify(floor)} floor`)
            }

            //  If the elevator is moving
         } else {
            // The floor called is above the currentFloor
            if (floor > this.currentFloor) {
               // The elevator is going up
               if (this.elevatorDirection === "up") {
                  // The floor is at least 2 floors above the curentFloor
                  if (floor - this.currentFloor >= 2 || this.isPaused) {
                     direction = "up"

                     // The floor is less than 2 floors above the currentFloor
                  } else {
                     direction = "down"
                  }

                  // The elevator is going down
               } else {
                  direction = "up"
               }

               // The floor called is below the currentFloor
            } else if (floor <= this.currentFloor) {
               // The elevator is going down
               if (this.elevatorDirection === "down") {
                  // The floor is at least 2 floors above the curentFloor
                  if (this.currentFloor - floor >= 2 || this.isPaused) {
                     direction = "down"

                     // The floor is less than 2 floors above the currentFloor
                  } else {
                     direction = "up"
                  }

                  // The elevator is going up
               } else {
                  direction = "down"
               }
            }
         }
      }

      if (floor == this.currentFloor && ((direction === this.elevatorDirection && !this.isPaused) || this.destinationFloor === null)) {
         return addToLogs(this.name, `The elevator is already at ${florify(floor)} floor`)
      }

      this.queue[direction].add(floor)

      this.isMoving ? !this.isPaused ? this.selectDestinationFloor() : null : this.selectDestinationFloor()
      addToLogs(this.name, `{up: ${Array.from(this.queue["up"])},  down: ${Array.from(this.queue["down"])}}`)
      return true
   }

   selectQueueDirection() {
      let downQueue = Array.from(this.queue["down"])
      let upQueue = Array.from(this.queue["up"])
      let upQueueAbove = upQueue.filter(floor => floor > this.currentFloor)
      let downQueueBelow = downQueue.filter(floor => floor < this.currentFloor)

      // The elevator is on standby
      if (!this.isMoving) {
         // Check the up queue for emptiness
         if (upQueue.length !== 0) {
            this.queueDirection = "up"

            // Check the down queue for emptiness
         } else if (downQueue.length !== 0) {
            this.queueDirection = "down"
         }
         // The elevator is moving
      } else {
         // The queue is up
         if (this.queueDirection === "up") {
            // There are some floors in the up queue
            if (upQueue.length !== 0) {
               // Check the floor in the up queue above the currentFLoor
               if (upQueueAbove.length !== 0 || downQueue.length === 0) {
                  // do nothing
               } else if (downQueue.length !== 0 || this.currentFloor === this.maxFloor) {
                  this.queueDirection = "down"
               }

               // Check the downQueue
            } else if (downQueue.length !== 0) {
               this.queueDirection = "down"
            } else {
               this.queueDirection = null
            }
            // The queue is down
         } else {
            // There are some floors in the up queue
            if (downQueue.length !== 0) {
               // Check the floor in the up queue above the currentFLoor
               if (downQueueBelow.length !== 0 || upQueue.length === 0) {
                  // do nothing
               } else if (downQueue.length !== 0) {
                  this.queueDirection = "up"
               }

               // Check the downQueue
            } else if (upQueue.length !== 0 || this.currentFloor === this.minFloor) {
               this.queueDirection = "up"
            } else {
               this.queueDirection = null
            }
         }
      }

      this.queueDirection !== null ? this.selectElevatorDirection() : null
   }

   selectElevatorDirection() {
      if (!this.isMoving) {
         if (this.queue[this.queueDirection].size > 0) {
            this.elevatorDirection = Array.from(this.queue[this.queueDirection])[0] > this.currentFloor ? "up" : "down"
         } else {
            this.elevatorDirection = null
         }

      } else {
         if (this.destinationFloor !== null) {
            if (this.destinationFloor > this.currentFloor) {
               this.elevatorDirection = "up"
            } else if (this.destinationFloor < this.currentFloor) {
               this.elevatorDirection = "down"
            }
         } else {
            this.elevatorDirection = null
         }
      }
   }

   selectDestinationFloor() {
      this.selectQueueDirection()
      let nextFloor = null
      let upQueue = Array.from(this.queue["up"]).sort((a, b) => {
         return a - b
      })
      addToLogs(this.name, `upQueue: [${upQueue}]`)
      let downQueue = Array.from(this.queue["down"]).sort((a, b) => {
         return b - a
      })
      addToLogs(this.name, `downQueue: [${downQueue}]`)
      // The elevator is on standby
      if (!this.isMoving) {
         let currentQueue = Array.from(this.queue[this.queueDirection])
         this.queue[`${this.queueDirection}Next`] = currentQueue[0]
         // The elevator is moving
      } else {
         // upNext
         // Up queue is not empty
         if (this.queue["up"].size !== 0) {
            // The elevator is going up
            if (this.elevatorDirection === "up") {
               nextFloor = upQueue.find(floor => floor > this.currentFloor)
               this.queue["upNext"] = nextFloor !== undefined ? nextFloor : upQueue[0]

               // The elevator is going down
            } else {
               this.queue["upNext"] = upQueue[0]
            }

            // Up queue is empty
         } else {
            this.queue["upNext"] = null
         }

         // downNext
         // Down queue is not empty
         if (this.queue["down"].size !== 0) {
            // The elevator is going down
            if (this.elevatorDirection === "down") {
               nextFloor = downQueue.find(floor => floor < this.currentFloor)
               this.queue["downNext"] = nextFloor !== undefined ? nextFloor : downQueue[0]

               // The elevator is going up
            } else {
               this.queue["downNext"] = downQueue[0]
            }

            // Down queue is empty
         } else {
            this.queue["downNext"] = null
         }
      }

      if (this.elevatorDirection === "up") {
         if (this.queue["upNext"] !== null && this.queue["upNext"] > this.currentFloor) {
            this.destinationFloor = this.queue["upNext"]
         } else if (this.queue["downNext"] !== null) {
            this.destinationFloor = this.queue["downNext"]
         } else {
            this.destinationFloor = null
         }
      } else if (this.elevatorDirection === "down") {
         if (this.queue["downNext"] !== null && this.queue["downNext"] < this.currentFloor) {
            this.destinationFloor = this.queue["downNext"]
         } else if (this.queue["upNext"] !== null) {
            this.destinationFloor = this.queue["upNext"]
         } else {
            this.destinationFloor = null
         }
      }
      this.selectElevatorDirection()


      if (this.destinationFloor == this.currentFloor) {
         this.queue[this.queueDirection].delete(this.destinationFloor)
         this.updateSelected();
         return this.selectDestinationFloor()
      }
      this.isMoving = this.destinationFloor !== null ? true : this.stop() // only move elevator when the destinationFloor is not null
      this.isMoving && !this.interval && !this.isPaused ? this.move() : null // only call elevator when interval is false; to avoid setting multiple intervals 
      addToLogs(this.name, this.statuses())
   }

   move() {
      if (this.isMoving) {
         this.interval = setInterval(() => {
            if (!this.isPaused) {
               if (this.elevatorDirection === "up") {
                  this.currentFloor++
               } else if (this.elevatorDirection === "down") {
                  this.currentFloor--
               }

               addToLogs(this.name, `The elevator is at ${florify(this.currentFloor)} floor`)
               updateCurrent(this.name, this.currentFloor)

               if (this.currentFloor == this.destinationFloor) {
                  this.handleElevatorArrival()
               }
            }
         }, 2000);
      }
   }

   handleElevatorArrival() {
      clearInterval(this.interval)
      this.isPaused = true
      this.interval = false
      addToLogs(this.name, `&lArr;  &lArr;  DOORS OPENING  &rArr;  &rArr;`, { textAlign: "center", backgroundColor: "#b3e6b5", color: "#3c620b", fontWeight: "bold" })
      this.updateSelected()
      setTimeout(() => {
         addToLogs(this.name, `&rArr;  &rArr;  DOORS CLOSING  &lArr;  &lArr;`, { textAlign: "center", backgroundColor: "#ff9999", color: "#cf1c44", fontWeight: "bold" })
         this.queue[this.queueDirection].delete(this.destinationFloor)
         this.isPaused = false
         this.selectDestinationFloor()
      }, 5000);
   }

   stop() {
      clearInterval(this.interval)
      this.interval = false
      this.isPaused = false
      addToLogs(this.name, "The elevator is on standby. Queue empty!", { backgroundColor: "darkgray", textAlign: "center" })
      return false
   }

   pause() {
      this.isPaused = true
      // clearInterval(this.interval)
      // this.interval = false
      addToLogs(this.name, `Elevator has been paused`, { color: "#003396", fontWeight: "bold", textAlign: "center", backgroundColor: "#86cefa" })
   }

   run() {
      this.isPaused = false
      if (this.interval === false) {
         this.move()

      }
   }

   updateSelected() {
      document.getElementById(`${this.name}${this.destinationFloor}button`).classList.remove("selected")
      let indicator = document.getElementById(`${this.name}${this.destinationFloor}${this.queueDirection}`)
      if (indicator) {
         indicator.classList.remove("selected")
      }
   }

   statuses() {
      return `{up: [${Array.from(this.queue["up"])}],  down: [${Array.from(this.queue["down"])}], 
      upNext: ${florify(this.queue["upNext"])}, downNext: ${florify(this.queue["downNext"])}, queueDirection: ${this.queueDirection}, elevatorDirection: ${this.elevatorDirection},
      destinationFloor: ${florify(this.destinationFloor)}`
   }

   otherQueue() {
      return this.queueDirection === "up" ? "down" : this.queueDirection === "down" ? "up" : null
   }
}

function florify(num) {
   num ? num = num.toString() : num
   switch (true) {
      case num === null:
         return num
      case /^-\d*$/.test(num):
         num = "basement " + (parseInt(num) * -1)
         break
      case /^0$/.test(num):
         num = "ground"
         break
      case /\d*(11|12|13)$/.test(num):
         num = num + "th"
         break;
      case /\d*1$/.test(num):
         num = num + "st"
         break
      case /\d*2$/.test(num):
         num = num + "nd"
         break
      case /\d*3$/.test(num):
         num = num + "rd"
         break
      default:
         num = num + "th"
   }
   return `<span class="floor-number">${num}</span>`
}


