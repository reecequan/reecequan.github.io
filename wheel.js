const options=["Creamy Pasta & Garlic Bread", "Black Bean Tacos", "Cauliflour Curry & Bread", "Nugs and Chips", "Jacket & Filling", "Enchaladas", "Pie & Mash", "Lentil Spagbol", "5 Bean Chilli & Rice", "Mushroom Risotto", "Buritto Bowl", "Burgers", "Soup & Bread", "Sausage Egg Chips & Beans", "Veg Stew & Dumplings" , "Sunday Lunch" , "Fried Rice" , "Pasta bake & Garlic bread" , "Stirfry or Noodles" ,"Pizza" ];

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
		setTimeout(clearInterval, rollTime, interval)
	}, 100);
}

function rolDice() {
	disableButton()
	loopOptions(Math.floor(Math.random() * (options.length )))
	var picked=document.getElementById("box").innerHTML
	setTimeout(enableButton, rollTime)
	setTimeout(updateHistory, rollTime, picked)
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
	pruneHistory()
	if (option != undefined) {
		history.unshift(option)
	}
	publishHistory()
	saveHistory()
}

function publishHistory() {
	var historyValue=""
	for (value in history) {
		if (value == 0 ) {
			historyValue=history[0]
		} else {
			historyValue=historyValue+"<br>"+ history[value]
		}
	}
	document.getElementById("historyValues").innerHTML=historyValue
	saveHistory()
}

function pruneHistory() {
	while (history.length >= 5 ) {
		history.pop()
	}
}

function loadHistoryFromCookie() {
	var historyStuff = getHistoryFromCokokie()
	if (historyStuff === undefined) {
		return
	}
	historyStuff = historyStuff.split(",")
	for(var i = historyStuff.length ; i >= 0 ; --i ) {
		updateHistory(historyStuff[i])
	}

}

function getHistoryFromCokokie() {
	return document.cookie.match("(^|;)\\s*history\\s*=\\s*([^;]+)")?.pop() || undefined
} 

function saveHistory() {
	var t="history="+history
	document.cookie = "history="+history
}

window.onload = loadHistoryFromCookie()

