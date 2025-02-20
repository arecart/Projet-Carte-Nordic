const express = require('express');
const { Sequelize } = require('sequelize');
require('dotenv').config();

const app = express();
const PORT = 4567;

app.use(express.json());

const sequelize = new Sequelize(
    process.env.SEQUELIZE_DATABASE,
    process.env.SEQUELIZE_USER,
    process.env.SEQUELIZE_PASSWORD,
    {
        host: process.env.SEQUELIZE_HOST,
        dialect: 'mysql',
        logging: false,
        pool: {
            max: 5,
            min: 0,
            idle: 10000
        }
    }
);

app.post('/data', async (req, res) => {
    try {
        const data = req.body;
        
        if (!data.temperature || !data.humidity) {
            return res.status(400).json({
                status: 'error',
                message: 'Données manquantes: température ou humidité'
            });
        }

        if (data.temperature < -20 || data.temperature > 40) {
            return res.status(400).json({
                status: 'error',
                message: 'Température hors limites (-20°C à 40°C)'
            });
        }

        if (data.humidity < 0 || data.humidity > 100) {
            return res.status(400).json({
                status: 'error',
                message: 'Humidité hors limites (0% à 100%)'
            });
        }

        let processingTime;
        if (data.processing_time) {
            if (data.processing_time < 5 || data.processing_time > 10000) {
                return res.status(400).json({
                    status: 'error',
                    message: 'Temps de traitement hors limites (5ms à 10000ms)'
                });
            }
            processingTime = data.processing_time;
        } else {
            const start = Date.now();
            await new Promise(resolve => setTimeout(resolve, 50));
            processingTime = Date.now() - start;
        }

        const query = "INSERT INTO measurements (temperature, humidity, processing_time) VALUES (?, ?, ?)";
        const params = [data.temperature, data.humidity, processingTime];
        
        await sequelize.query(query, {
            replacements: params,
            type: Sequelize.QueryTypes.INSERT
        });

        console.log(`Données reçues - Temp: ${data.temperature}°C, Humidity: ${data.humidity}%, Processing Time: ${processingTime}ms`);

        res.status(200).json({
            status: 'success',
            message: 'Données enregistrées avec succès',
            data: {
                temperature: data.temperature,
                humidity: data.humidity,
                processing_time: processingTime
            }
        });
    } catch (error) {
        console.error('Erreur lors de l\'enregistrement:', error);
        res.status(500).json({
            status: 'error',
            message: 'Erreur serveur'
        });
    }
});

async function testConnection() {
    try {
        await sequelize.authenticate();
        console.log('Connection to database has been established successfully.');
    } catch (error) {
        console.error('Unable to connect to the database:', error);
    }
}

app.listen(PORT, () => {
    console.log(`Serveur de réception des payloads démarré sur le port ${PORT}`);
    testConnection();
});
