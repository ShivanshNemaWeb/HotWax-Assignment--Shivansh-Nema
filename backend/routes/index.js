const express = require('express');
const router = express.Router();

const crudRoutes = require('./crud');

router.use('/crud',crudRoutes);

module.exports = router;