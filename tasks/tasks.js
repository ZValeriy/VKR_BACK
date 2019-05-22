const uid = require('uid-safe');
var bot = require('../botCreating');

const Pool = require('pg').Pool;
const pool = new Pool({
    user: 'postgres',
    host: 'localhost',
    database: 'Reshatel',
    password: '123456',
    port: 5432,
});

const getTasks = (request, response) => {
    pool.query('SELECT * FROM resh.learner ORDER BY id ASC', (error, results) => {
        if (error) {
            throw error
        }
        response.status(200).json(results)
    });
};

const generateUID = (req, res) => {
    const strUid = uid.sync(18);

    res.status(200).json({guid: strUid});
};

const signupUser = async (req, res) => {
    const body = req.body;
    let text = '';
    let values = [];

    if (body.role === 'teacher') {
        text = `INSERT INTO
      resh.teacher(name, lastname, login, password)
      VALUES($1, $2, $3, $4)
      returning *`;

        values = [
            body.name,
            body.lastName,
            body.login,
            body.password
        ]
    }

    if (body.role === 'learner') {
        text = `INSERT INTO
      resh.learner(name, lastname, login, password)
      VALUES($1, $2, $3, $4)
      returning *`;

        values = [
            body.name,
            body.lastName,
            body.login,
            body.password
        ]
    }

    try {
        const {rows} = await pool.query(text, values);
        return res.status(201).send(rows[0]);
    } catch (error) {
        console.log(error.stack);
        return res.status(400).send(error);
    }
};

const signinUser = async (req, res) => {
    const body = req.body;

    let user = await getUser('teacher', body.login, body.password);
    if (user) {
        return res.status(200).send({isOK: true, role: teacher});
    }
    if (user === null) {
        user = await getUser('learner', body.login, body.password);
        if (user) {
            return res.status(200).send({isOK: true, role: learner});
        }
        return res.status(200).send({isOK: false});
    }
};

const getUser = async (role, login, password) => {
    const text = `SELECT id FROM resh.${role} WHERE resh.${role}.login = '${login}' 
    AND resh.${role}.password = '${password}'`;

    try {
        const {rows} = await pool.query(text);
        if (!rows || rows.length === 0) {
            return null;
        }
        return rows[0];
    } catch (error) {
        console.log(error);
    }
}

const isExists = async (req, res) => {
    const body = req.body;
    const text = `SELECT * FROM resh.teacher WHERE login = ` + body;
    try {
        const isExists = await pool.query(text);
        if (isExists) {
            return res.status(200).send(true);
        } else {
            return res.status(200).send(false);
        }
    } catch (error) {
        console.log(error.stack);
        return res.status(400).send(error);
    }
};

const addTgToDatabase = async (role, chatId, login) => {
    let text = '';
    if (role === 'learner') {
        text = `UPDATE resh.learner
        SET phone = '${chatId}'
        WHERE resh.learner.login = '${login}' RETURNING *`
    }

    if (role === 'teacher') {
        text = `UPDATE resh.teacher
        SET phone = '${chatId}'
        WHERE resh.teacher.login = '${login}' RETURNING *`
    }

    if (role === 'parent') {
        text = `UPDATE resh.learner
        SET parentPhone = '${chatId}'
        WHERE resh.learner.login = '${login}' RETURNING *`
    }

    try {
        const {rows} = await pool.query(text);
        if (rows.length === 0 || !rows) {
            return false;
        }
        return rows[0];
    } catch (error) {
        //console.log(error);
    }
};

const getSections = async (req, res) => {
    const text = `SELECT * from resh.section`;
    try {
        const {rows} = await pool.query(text);
        if (rows.length === 0 || !rows) {
            return false;
        }
        return res.status(200).send(rows);
    } catch (error) {
        return res.status(404).send(error);
    }
};

const getLearners = async (req, res) => {
    const text = `SELECT * from resh.learner WHERE resh.learner.teacheruuid = '${req.body.teacherId}'`;
    try {
        const {rows} = await pool.query(text);
        if (rows.length === 0 || !rows) {
            return false;
        }
        return res.status(200).send(rows);
    } catch (error) {
        console.log(error);
        return res.status(404).send(error);
    }
};

const getTeacher = async (teacherId) => {
    const text = `SELECT * FROM resh.teacher WHERE id = '${teacherId}'`;
    try {
        const {rows} = await pool.query(text);
        if (rows.length === 0 || !rows) {
            return false;
        }
        return rows[0];
    } catch (error) {
        console.log(error);
    }
};

const addLearner = async (req, res) => {
    const text = `UPDATE resh.learner
        SET teacheruuid = '${req.body.teacherId}'
        WHERE resh.learner.login = '${req.body.login}' RETURNING *`;

    try {
        const {rows} = await pool.query(text);
        if (rows.length === 0 || !rows) {
            return res.status(200).send(false);
        }

        getTeacher(req.body.teacherId)
            .then(function (teacherResponse) {
                if (teacherResponse) {
                    if (rows[0].phone) {
                        bot.sendMessage(rows[0].phone, `Вас добавил учитель ${teacherResponse.name} ${teacherResponse.lastname}!`);
                    }

                    if (rows[0].parentphone) {
                        bot.sendMessage(rows[0].phone, `Вашего ребенка добавил учитель ${teacherResponse.name} ${teacherResponse.lastname}!`);
                    }

                }
            });

        return res.status(200).send(rows[0]);


    } catch (error) {
        console.log(error);
        return res.status(404).send(error);
    }
};

const getDoneWorks = async (req, res) => {
    const text = `SELECT grade, maxgrade FROM resh.donework WHERE learneruuid = '${req.body.id}'`;
    try {
        const {rows} = await pool.query(text);
        if (rows.length === 0 || !rows) {
            return res.status(200).send(null);
        }
        return res.status(200).send(rows);
    } catch (error) {
        console.log(error);
    }
};

const getMaximumTasks = async (req, res) => {
    const text = `SELECT resh.task.section, count(resh.task.id) FROM resh.task GROUP BY section`;
    try {
        const {rows} = await pool.query(text);
        if (rows.length === 0 || !rows) {
            return false;
        }
        return res.status(200).send(rows);
    } catch (error) {
        return res.status(404).send(error);
    }
};

function getDate() {
    var date = new Date();
    var now_utc = Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate(),
        date.getUTCHours(), date.getUTCMinutes(), date.getUTCSeconds());

    return new Date(now_utc);
}

const createWork = async (req, res) => {
    const body = req.body;

    const creatingText = `INSERT INTO resh.work(title, begindate, enddate)
    VALUES($1, to_timestamp(${Date.now()} / 1000.0), $2)
    returning id`;

    const values = [
        body.title,
        body.date
    ];

    let workid = null;

    try {
        const {rows} = await pool.query(creatingText, values);
        workid = rows[0].id;
    } catch (error) {
        console.log(error.stack);
        return res.status(400).send(error);
    }

    if (body.type === 'standard') {
        const standardCreateText =
            `INSERT INTO resh.work_tasks (workid, taskid)
VALUES ('${workid}', (SELECT id FROM resh.task WHERE position = 1 LIMIT 1)),
       ('${workid}', (SELECT id FROM resh.task WHERE position = 2 LIMIT 1)),
       ('${workid}', (SELECT id FROM resh.task WHERE position = 3 LIMIT 1)),
       ('${workid}', (SELECT id FROM resh.task WHERE position = 4 LIMIT 1)),
       ('${workid}', (SELECT id FROM resh.task WHERE position = 5 LIMIT 1)),
       ('${workid}', (SELECT id FROM resh.task WHERE position = 6 LIMIT 1)),
       ('${workid}', (SELECT id FROM resh.task WHERE position = 7 LIMIT 1)),
       ('${workid}', (SELECT id FROM resh.task WHERE position = 8 LIMIT 1)),
       ('${workid}', (SELECT id FROM resh.task WHERE position = 9 LIMIT 1)),
       ('${workid}', (SELECT id FROM resh.task WHERE position = 10 LIMIT 1)),
       ('${workid}', (SELECT id FROM resh.task WHERE position = 11 LIMIT 1)),
       ('${workid}', (SELECT id FROM resh.task WHERE position = 12 LIMIT 1)),
       ('${workid}', (SELECT id FROM resh.task WHERE position = 13 LIMIT 1)),
       ('${workid}', (SELECT id FROM resh.task WHERE position = 14 LIMIT 1)),
       ('${workid}', (SELECT id FROM resh.task WHERE position = 15 LIMIT 1)),
       ('${workid}', (SELECT id FROM resh.task WHERE position = 16 LIMIT 1)),
       ('${workid}', (SELECT id FROM resh.task WHERE position = 17 LIMIT 1)),
       ('${workid}', (SELECT id FROM resh.task WHERE position = 18 LIMIT 1)),
       ('${workid}', (SELECT id FROM resh.task WHERE position = 19 LIMIT 1)),
       ('${workid}', (SELECT id FROM resh.task WHERE position = 20 LIMIT 1)),
       ('${workid}', (SELECT id FROM resh.task WHERE position = 21 LIMIT 1)),
       ('${workid}', (SELECT id FROM resh.task WHERE position = 22 LIMIT 1)),
       ('${workid}', (SELECT id FROM resh.task WHERE position = 23 LIMIT 1)),
       ('${workid}', (SELECT id FROM resh.task WHERE position = 24 LIMIT 1)),
       ('${workid}', (SELECT id FROM resh.task WHERE position = 25 LIMIT 1)),
       ('${workid}', (SELECT id FROM resh.task WHERE position = 26 LIMIT 1)),
       ('${workid}', (SELECT id FROM resh.task WHERE position = 27 LIMIT 1)),
       ('${workid}', (SELECT id FROM resh.task WHERE position = 28 LIMIT 1))`;

        try {
            const {rows} = await pool.query(standardCreateText);
        } catch (error) {
            console.log(error.stack);
            return res.status(400).send(error);
        }
    }

    if (body.type === 'own') {

        let tmpText = '';

        body.tasks.forEach(item => {
            for (let i=0; i < item.quantity; i++) {
                tmpText += `('${workid}', (SELECT id FROM resh.task WHERE section = '${item.id}' LIMIT 1)),`;
            }
            return item;
        });

        tmpText = tmpText.slice(0, tmpText.length - 1);

        const ownCreateText =
            `INSERT INTO resh.work_tasks (workid, taskid) VALUES ${tmpText}`;

        try {
            const {rows} = await pool.query(ownCreateText);
        } catch (error) {
            console.log(error.stack);
            return res.status(400).send(error);
        }
    }

    let valuesText = '';
    body.learner.forEach(item => {
        valuesText += `('${workid}', '${item.id}'),`
    });
    valuesText = valuesText.slice(0, valuesText.length - 1);

    const creatingInLearnersText =
        `INSERT INTO resh.worklearner (workid, learnerid)
        VALUES ${valuesText} RETURNING *`;

    try {
        const {rows} = await pool.query(creatingInLearnersText);
        if (rows) {
            console.log('Добавил ученикофф');
            body.learner.forEach(item => {
                if (item.phone) {
                    bot.sendMessage(
                        item.phone,
                        `Вам была задана работа '${body.title}'.\nЗайдите в свой профиль, чтобы прорешать её`
                    );
                }

                if (item.parentphone) {
                    bot.sendMessage(
                        item.parentphone,
                        `Вашему ребенку была задана работа '${body.title}'.`
                    );
                }

                return item;
            });
            return res.status(200).send(true);
        }
    } catch (error) {
        console.log(error.stack);
        return res.status(400).send(error);
    }
};

const createTask = async (req, res) => {
    const body = req.body;
    const text =
        `INSERT INTO resh.task(tasktext, taskanswer, section, type, position)
        VALUES('${body.text}', '${body.answer}', '${body.selectSection}', '${body.selectType}', '${body.position}')`;

    try {
        const {rows} = await pool.query(text);
        return res.status(200).send(true);
    } catch (error) {
        return res.status(404).send(error);
    }
};

const getNotDoneWorks = async (req, res) => {
    const body = req.body;
    const text = `SELECT * FROM resh.work
WHERE id in (SELECT workid FROM resh.worklearner WHERE (learnerid = '${body.id}' AND isdone is FALSE))`;

    try {
        const {rows} = await pool.query(text);
        return res.status(200).send(rows);
    } catch (error) {
        return res.status(404).send(error);
    }
};

const getTasksFromWork = async (req, res) => {
    const body = req.body;
    const text = `SELECT tasktext, resh.section.title FROM resh.task JOIN resh.section ON task.section = section.id WHERE resh.task.id IN (SELECT taskid FROM resh.work_tasks WHERE workid = '${body.id}')`;
    try {
        const {rows} = await pool.query(text);
        return res.status(200).send(rows);
    } catch (error) {
        console.log(error);
        return res.status(404).send(error);
    }
};


module.exports = {
    getTasks,
    generateUID,
    signupUser,
    isExists,
    signinUser,
    addTgToDatabase,
    getSections,
    getLearners,
    addLearner,
    getDoneWorks,
    getMaximumTasks,
    createWork,
    createTask,
    getNotDoneWorks,
    getTasksFromWork
};
