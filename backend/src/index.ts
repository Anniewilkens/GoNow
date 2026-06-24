import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import transitRouter from './routes/transit';
import weatherRouter from './routes/weather';
import geocodeRouter from './routes/geocode';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

app.use('/api/transit', transitRouter);
app.use('/api/weather', weatherRouter);
app.use('/api/geocode', geocodeRouter);

app.listen(PORT, () => {
  console.log(`GoNow backend kör på port ${PORT}`);
});
