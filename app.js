const express = require('express');
const cors = require('cors');
const mysql = require('mysql2/promise');

const app = express();

require('dotenv').config();

const port = process.env.PORT;

const pool = mysql.createPool({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_DATABASE
});

app.use(async function (req, res, next) {
    try {
        req.db = await pool.getConnection();
        req.db.connection.config.namedPlaceholders = true;

        await req.db.query(`SET SESSION sql_mode = "TRADITIONAL"`);
        await req.db.query(`SET time_zone = '-8:00'`);

        await next();

        req.db.release();
    } catch (err) {
        console.log(err);

        if (req.db) req.db.release();
        throw err;
    }
});

app.use(cors());

app.use(express.json());

app.get('/cars', async function (req, res) {
    try {
        res.json({ success: true, data: (await pool.query('SELECT * FROM car'))[0] });
    } catch (err) {
        res.json({ success: false, message: err, data: null });
    }
});

app.get('/cars/:id', async function (req, res) {
    try {
        const query = (await pool.query('SELECT * FROM car WHERE id = ?', [req.params.id]))[0];

        if (query[0])
            res.json({ success: true, data: query[0] });
        else
            res.json({ success: false, msg: `no car with id ${req.params.id}` });
    } catch (err) {
        res.json({ success: false, message: err, data: null });
    }
});

app.use(async function (req, res, next) {
    try {
        console.log('Middleware after the get /cars');

        await next();

    } catch (err) {
    }
});

app.post('/car', async function (req, res) {
    try {
        const { make, model, year } = req.body;

        const query = await req.db.query(
            `INSERT INTO car (make, model, year) 
       VALUES (:make, :model, :year)`,
            {
                make,
                model,
                year,
            }
        );

        res.json({ success: true, message: 'Car successfully created', data: null });
    } catch (err) {
        res.json({ success: false, message: err, data: null });
    }
});

app.delete('/car/:id', async function (req, res) {
    try {
        const [rows] = await pool.query('SELECT * FROM car WHERE id = ? AND deleted_flag = 0', [req.params.id]);

        if (rows.length > 0) {
            await pool.query('UPDATE car SET deleted_flag = 1 WHERE id = ?', [req.params.id]);
            res.json({ success: true, message: 'Car successfully deleted', data: null });
        } else
            res.json({ success: false, message: `No car with id ${req.params.id}`, data: null });
    } catch (err) {
        res.json({ success: false, message: err, data: null });
    }
});

app.put('/car', async function (req, res) {
    try {
        let updateFields = [];
        let updateValues = [];

        if (req.body.make) {
            updateFields.push('make = ?');
            updateValues.push(req.body.make);
        }
        if (req.body.model) {
            updateFields.push('model = ?');
            updateValues.push(req.body.model);
        }
        if (req.body.year) {
            updateFields.push('year = ?');
            updateValues.push(req.body.year);
        }

        if (updateFields.length > 0) {
            updateValues.push(req.body.id);
            await pool.query(`UPDATE car SET ${updateFields.join(', ')} WHERE id = ?`, updateValues);
            res.json({ success: true, message: 'Car successfully updated', data: null });
        } else {
            res.json({ success: false, message: 'No fields to update', data: null });
        }
    } catch (err) {
        res.json({ success: false, message: err, data: null });
    }
});


app.listen(port, () => console.log(`212 API Example listening on http://localhost:${port}`));
