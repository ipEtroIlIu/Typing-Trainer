let storyText = '';
let startTime,
	user = '',
	errors = 0,
	finished = false;

const input = document.getElementById('inputArea');
const storyContainer = document.getElementById('storyContainer');
const stats = document.getElementById('stats');
const usernameInput = document.getElementById('username');
const startBtn = document.getElementById('startButton');
const saveBtn = document.getElementById('saveButton');
const leaderboard = document.getElementById('leaderboard');
const randomMode = document.getElementById('randomMode');
const customMode = document.getElementById('customMode');
const customTextArea = document.getElementById('customText');

let loadedRandomText = '';

function fetchStory() {
	// Показываем надпись "Подождите..."
	document.getElementById('loadingHint').style.display = 'block';

	fetch('https://shortstories-api.onrender.com/')
		.then((res) => res.json())
		.then((data) => {
			storyText = data.story.trim();
			loadedRandomText = storyText;
			updateStoryDisplay('');
			input.value = '';
			input.disabled = false;
			input.focus();
			startTime = null;
			errors = 0;
			finished = false;
			saveBtn.style.display = 'none';

			// Прячем надпись после загрузки текста
			document.getElementById('loadingHint').style.display = 'none';
		});
}

function updateStoryDisplay(typed) {
	let output = '';
	for (let i = 0; i < typed.length; i++) {
		const char = typed[i];
		const correctChar = storyText[i];
		if (char === correctChar) {
			output += `<span class="correct">${correctChar}</span>`;
		} else {
			output += `<span class="incorrect">${correctChar}</span>`;
		}
	}
	const remaining = storyText.slice(typed.length);
	output += `<span id="remainingText" style="color: #999;">${remaining}</span>`;
	storyContainer.innerHTML = output;
}

input.addEventListener('input', () => {
	if (finished) return;
	if (!startTime) {
		startTime = Date.now();
	}
	const typed = input.value;
	const expected = storyText.slice(0, typed.length);
	if (typed[typed.length - 1] !== expected[expected.length - 1]) {
		errors++;
	}
	updateStoryDisplay(typed);
	if (typed === storyText) {
		const timeTaken = (Date.now() - startTime) / 1000;
		const timeMin = timeTaken / 60;
		const wpm = Math.round(storyText.length / 5 / timeMin);
		const points = Math.round(wpm * timeMin - errors * 3);
		stats.innerText = `Finished! Speed: ${wpm} WPM | Time: ${timeMin.toFixed(2)} min | Errors: ${errors} | Points: ${points}`;
		input.disabled = true;
		finished = true;
		saveBtn.style.display = 'inline';
		document.getElementById('saveHint').style.display = 'block';
		saveBtn.dataset.stats = JSON.stringify({ wpm, time: timeMin.toFixed(2), errors, points });

		if (document.querySelector('input[name="mode"]:checked').value === 'custom') {
			customTextArea.style.display = 'block';
		}
		customTextArea.value = '';
	}
});

randomMode.addEventListener('change', () => {
	customTextArea.style.display = 'none';
	storyContainer.style.display = 'block';

	if (loadedRandomText) {
		storyText = loadedRandomText;
		updateStoryDisplay(input.value);
	}
});

customMode.addEventListener('change', () => {
	customTextArea.style.display = 'block';
	storyContainer.style.display = 'none';
});

customMode.addEventListener('click', () => {
	if (customMode.checked) {
		customTextArea.style.display = 'block';
	}
});

function restart() {
	user = usernameInput.value.trim() || 'anonymous';
	stats.innerText = '';
	input.value = '';
	input.disabled = true;
	finished = false;
	errors = 0;
	startTime = null;
	saveBtn.style.display = 'none';
	document.getElementById('saveHint').style.display = 'none';
	leaderboard.innerHTML = '';

	const mode = document.querySelector('input[name="mode"]:checked').value;

	if (mode === 'random') {
		customTextArea.style.display = 'none';
		storyContainer.style.display = 'block';

		document.getElementById('loadingHint').style.display = 'block';

		fetch('https://shortstories-api.onrender.com/')
			.then((res) => res.json())
			.then((data) => {
				storyText = data.story.trim();
				loadedRandomText = storyText;
				updateStoryDisplay('');
				input.value = '';
				input.disabled = false;
				input.focus();
				document.getElementById('loadingHint').style.display = 'none';
			})
			.catch((err) => {
				console.error('Error loading text:', err);
				alert('Unable to load text. Please try again. Error loading text.');
				document.getElementById('loadingHint').style.display = 'none';
			});
	} else {
		const customText = customTextArea.value.trim();
		if (!customText) {
			alert('Please enter your custom text.');
			return;
		}
		customTextArea.style.display = 'none';
		storyContainer.style.display = 'block';

		storyText = customText;
		updateStoryDisplay('');
		input.value = '';
		input.disabled = false;
		input.focus();
	}

	fetchLeaderboard();
}

function saveResult() {
	const { wpm, time, errors, points } = JSON.parse(saveBtn.dataset.stats);
	let username = document.getElementById('username').value.trim();
	if (!username) {
		username = 'Anonymous';
	}
	const payload = { username, time, wpm, errors, points };
	fetch('https://kool.krister.ee/chat/typing_trainer', {
		method: 'POST',
		headers: { 'Content-Type': 'application/json' },
		body: JSON.stringify(payload),
	})
		.then((response) => response.text())
		.then((data) => {
			fetchLeaderboard();
		})
		.catch((error) => {
			console.error('Error while submitting:', error);
		});
}

function fetchLeaderboard() {
	fetch('https://kool.krister.ee/chat/typing_trainer')
		.then((res) => res.json())
		.then((data) => {
			const bestResults = {};

			data.forEach((entry) => {
				const name = entry.username.trim();
				if (!name || name.toLowerCase() === 'anonymous') return;

				if (!bestResults[name] || entry.points > bestResults[name].points) {
					bestResults[name] = entry;
				}
			});

			const topPlayers = Object.values(bestResults)
				.sort((a, b) => b.points - a.points)
				.slice(0, 5);

			leaderboard.innerHTML = topPlayers.map((p) => `<li id="leaders">${p.username}: ${p.points} points</li>`).join('');
		})
		.catch((err) => {
			console.error('Error loading leaderboard:', err);
		});
}

fetchLeaderboard();
