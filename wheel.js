const options=["Creamy Pasta & Garlic Bread", "Black Bean Tacos", "Cauliflour Curry & Bread", "Nugs and Chips", "Jacket & Filling", "Enchaladas", "Pie & Mash", "Lentil Spagbol", "5 Bean Chilli & Rice", "Mushroom Risotto", "Buritto Bowl", "Burgers", "Soup & Bread", "Sausage, Egg, Chips & Beans", "Veg Stew & Dumplings" , "Sunday Lunch" , "Fried Rice" , "Pasta bake & Garlic bread" , "Stirfry or Noodles" ,"Pizza" ];

const el = document.getElementById("box");
const history=[]
const rollTime=5000

function loopOptions(i) {
	var el = document.getElementById("box");
	var interval = setInterval(function() {
		if (options[i] !== undefined) {
			el.innerHTML = options[i];
		}
	  	i++
		if (i == 20) {
			i = 0
		}
		setTimeout(clearInterval, rollTime-20, interval)
	}, 100);
}

function rolDice() {
	disableButton()
	var number=Math.floor(Math.random() * (options.length ))
	loopOptions(Math.floor(Math.random() * (options.length )))
	setTimeout(updatePage, rollTime, options[number])
	setTimeout(enableButton, rollTime)
	setTimeout(updateHistory, rollTime, options[number])
}

function updatePage(p1) {
	document.getElementById("box").innerHTML = p1
}

function disableButton() {
	var btn = document.getElementById("diceButton")
	btn.classList.add("disabled")
	btn.innerHTML = "We're Rolling"
}

function enableButton() {
	var btn = document.getElementById("diceButton")
	btn.classList.remove("disabled")
	btn.innerHTML = "Click me to Roll"
}

function updateHistory(option) {
	var historyEl=document.getElementById("historyValues")

	history.unshift(option)
	var historyValue=""
	for (value in history) {
		if (value == 0 ) {
			historyValue=history[0]
		} else {
			historyValue=historyValue+"<br>"+ history[value]
		}
	}
	historyEl.innerHTML=historyValue
	saveHistory()
}

function prunHistory() {
	while (history.length >= 5 ) {
		history.pop()
	}
}

function loadHistoryFromCookie() {
	history.concat(document.cookie.match("history"))
}

function saveHistory() {
	var t="history="+history
	console.log(t)
	document.cookie = "history="+history
}

loadHistoryFromCookie()

