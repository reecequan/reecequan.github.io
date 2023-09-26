const options=["Creamy Pasta & Garlic Bread", "Black Bean Tacos", "Cauliflour Curry & Bread", "Nugs and Chips", "Jacket & Filling", "Enchaladas", "Pie & Mash", "Lentil Spagbol", "5 Bean Chilli & Rice", "Mushroom Risotto", "Buritto Bowl", "Burgers", "Soup & Bread", "Sausage, Egg, Chips & Beans", "Veg Stew & Dumplings" , "Sunday Lunch" , "Fried Rice" , "Pasta bake & Garlic bread" , "Stirfry or Noodles" ,"Pizza" ];

const el = document.getElementById("box");
var display=false

function loopOptions(i) {
	var el = document.getElementById("box");
	var interval = setInterval(function() {
		if (options[i] !== undefined) {
			el.innerHTML = options[i];
		}
	  	i++
		if (display) {
		  clearInterval(interval);
		}
		if (i == 20) {
			i = 0
		}			

	}, 100);
}

function rolDice() {
	disableButton()
	display=false
	var number=Math.floor(Math.random() * 21)
	loopOptions(Math.floor(Math.random() * 21))
	setTimeout(updatePage, 5000, options[number])
	setTimeout(enableButton, 5000)
}

function updatePage(p1) {
	document.getElementById("box").innerHTML = p1
	display=true
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