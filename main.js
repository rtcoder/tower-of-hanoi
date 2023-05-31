const tower = document.querySelector('.tower');
const discsCount = document.querySelector('.discs-count-number');
const moveCounter = document.querySelector('.moves-count');
const A = 0, B = 1, C = 2;
const app = {
    discs: 15,
    tower: [
        [], // A
        [], // B
        [], // C
    ]
};

function dragOver(ev) {
    ev.preventDefault();
    ev.target.classList.add('dragover');
}

function dragLeave(ev) {
    ev.preventDefault();
    ev.target.classList.remove('dragover');
}

function drag(ev) {
    const allDiscs = ev.target.parentNode.querySelectorAll('.disc');
    const dataIds = [...allDiscs].map(el => +el.getAttribute('data-id'));
    const minId = Math.min(...dataIds);
    const dataId = ev.target.getAttribute('data-id');

    if (minId !== +dataId) {
        ev.preventDefault();
    }
    ev.dataTransfer.effectAllowed = 'move';
    ev.dataTransfer.dropEffect = 'move';
    ev.dataTransfer.setData("text", dataId);
}

function drop(ev) {
    ev.preventDefault();
    ev.target.classList.remove('dragover');
    const allDiscs = ev.target.querySelectorAll('.disc');
    const dataIds = [...allDiscs].map(el => +el.getAttribute('data-id'));
    const minId = Math.min(...dataIds);

    const dataId = ev.dataTransfer.getData("text");
    if (minId < +dataId) {
        return;
    }

    const element = document.querySelector(`[data-id="${dataId}"]`);
    if (element.parentNode !== ev.target) {
        ev.target.prepend(element);
    }
}

function addListeners() {
    tower.addEventListener('drop', e => {
        if (e.target.classList.contains('line')) {
            drop(e);
        }
    })
    tower.addEventListener('dragover', e => {
        if (e.target.classList.contains('line')) {
            dragOver(e);
        }
    })
    tower.addEventListener('dragleave', e => {
        if (e.target.classList.contains('line')) {
            dragLeave(e);
        }
    })
    tower.addEventListener('dragstart', e => {
        if (e.target.classList.contains('disc')) {
            drag(e);
        }
    })
}

function getMovesOrder() {
    return app.discs % 2 === 0
        ? [[A, B], [A, C], [B, C]]
        : [[A, C], [A, B], [B, C]];
}

function generateTower() {
    const first = [];
    for (let i = 0; i < app.discs; i++) {
        first.push(i);
    }
    app.hanoi = [
        first,
        [],
        []
    ];
}

function setTowerDiscs() {
    tower.querySelectorAll('.line').forEach((el, index) => {
        el.innerHTML = app.hanoi[index].map(discId =>
            `<div class="disc d${discId}" data-id="${discId}" draggable="true">${discId}</div>`
        ).join('')
    });
}

function makeLegalMove(towers) {
    const [from, to] = towers;
    if (!app.hanoi[to].length && !app.hanoi[from]) {
        return;
    }

    if (!app.hanoi[to].length) {
        app.hanoi[to].push(app.hanoi[from].shift());
        return;
    }

    if (!app.hanoi[from].length) {
        app.hanoi[from].push(app.hanoi[to].shift());
        return;
    }

    if (app.hanoi[from][0] > app.hanoi[to][0]) {
        app.hanoi[from].unshift(app.hanoi[to].shift());
    } else {
        app.hanoi[to].unshift(app.hanoi[from].shift());
    }
}

function automaticallyResolveTower() {
    let move = 0;
    const movesOrder = getMovesOrder();

    const interval = setInterval(() => {

        makeLegalMove(movesOrder[move % 3]);
        setTowerDiscs();
        move++;
        moveCounter.innerHTML = move;

        // if (move === 4) {
        if (move === (2 ** app.discs - 1)) {
            clearInterval(interval);
        }

    }, 1);
}

discsCount.innerHTML = app.discs;

addListeners();
generateTower();
setTowerDiscs();
