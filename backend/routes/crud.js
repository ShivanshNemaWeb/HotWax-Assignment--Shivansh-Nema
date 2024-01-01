const express = require('express');
const router = express.Router();
const {crudControllers} = require('../controllers');

router.post('/persons',crudControllers.createPerson);

router.post('/orders',crudControllers.createOrder);

router.post('/orders/items',crudControllers.addOrderItems);

router.get('/orders',crudControllers.getAllOrders);

router.get('/orders/:orderId',crudControllers.getAnOrder);

router.put('/orders/:orderId',crudControllers.updateOrder);



module.exports = router;