const {db} = require('../config/db');

// Create Person - REST API
// Sample in-memory data storage
let orders = [];

//API to Create a person
exports.createPerson = async(req, res) => {
    const person = req.body;  
    // Insert into MySQL database
    db.query('INSERT INTO person SET ?', person, (err, results) => {
      if (err) throw err;
      res.json({ message: 'Person created successfully', results });
    });
  };

  // API to Create Order 
exports.createOrder = async(req, res) => {
    const orderData = req.body;
    const orderId = generateOrderId();
    orders.push({ orderId, ...orderData })  ;
  
    // Insert into MySQL database
    db.query('INSERT INTO order_header SET ?', { ORDER_ID: orderId, ...orderData }, (err, results) => {
      if (err) throw err;
      res.json({ message: 'Order created successfully', orderId });
    });
  };


  //API to Add Order Items 
  exports.addOrderItems = async (req, res) => {
    try {
        const { orderId, partName, facilityId, shipmentMethodEnumId = 'ShMthGround', customerPartyId, item_details } = req.body;

        // Insert Order Part
        const orderPartSeqId = generateOrderPartSeqId();
         db.query(
            "INSERT INTO order_part (ORDER_ID, ORDER_PART_SEQ_ID, PART_NAME, FACILITY_ID, SHIPMENT_METHOD_ENUM_ID, CUSTOMER_PARTY_ID) VALUES (?, ?,?, ?, ?, ?)",
            [orderId, orderPartSeqId, partName, facilityId, shipmentMethodEnumId, customerPartyId]
        );

        // Insert Order Items
        for (const item of item_details) {
          const orderItemSeqId = generateOrderItemSeqIdId();
            const { productId, itemDescription, quantity, unitAmount } = item;
             db.query(
                "INSERT INTO Order_Item (ORDER_ID, ORDER_ITEM_SEQ_ID, ORDER_PART_SEQ_ID, PRODUCT_ID, ITEM_DESCRIPTION, QUANTITY, UNIT_AMOUNT) VALUES (?, ?, ?, ?, ?, ?, ?)",
                [orderId, orderItemSeqId,orderPartSeqId, productId, itemDescription, quantity, unitAmount]
            );
        }

        res.status(200).json({ status: true, message: 'Order items added successfully', orderId, orderPartSeqId });
    } catch (error) {

        console.error(error);
        res.status(500).json({ status: false, message: 'Error adding order items' });
    }
  };

  
  //API to get an order
  exports.getAnOrder = async (req, res) => {
    const orderId = req.params.orderId;

    try {
      // Fetch order information from the order_header table
      const [orderRows] = await queryAsync('SELECT * FROM order_header WHERE ORDER_ID = ?', [orderId]);
      // Check if the order exists
      if (orderRows.length === 0) {
        return res.status(404).json({ status: false, message: 'Order not found' });
      }
  
      // Extract order details from the result
      const order = {
        orderId: orderRows.ORDER_ID,
        orderName: orderRows.ORDER_NAME,
        placedDate: orderRows.PLACED_DATE,
        approvedDate: orderRows.APPROVED_DATE,
        statusId: orderRows.STATUS_ID,
        currencyUomId: orderRows.CURRENCY_UOM_ID,
        productStoreId: orderRows.PRODUCT_STORE_ID,
        salesChannelEnumId: orderRows.SALES_CHANNEL_ENUM_ID,
        grandTotal: orderRows.GRAND_TOTAL,
        completedDate: orderRows.COMPLETED_DATE,
      };
  
      // Send the order details in the response
      res.status(200).json({ status: true, order: order });
    } catch (error) {
      console.error(error);
      res.status(500).json({ status: false, message: 'Error fetching order' });
    }
  };
  

  // API to Update Order

exports.updateOrder = async (req, res) => {
  const { orderId } = req.params;
  const { orderName } = req.body;

  try {
    // Update the order name in MySQL
    const updateResult = await queryAsync('UPDATE order_header SET ORDER_NAME = ? WHERE ORDER_ID = ?', [orderName, orderId]);
    // Check if the order was updated successfully
    if (updateResult.affectedRows > 0) {
      // Fetch the updated order details
      const [updatedOrderRows] = await queryAsync('SELECT * FROM order_header WHERE ORDER_ID = ?', [orderId]);
      // Extract updated order details
      const updatedOrder = {
        orderId: updatedOrderRows.ORDER_ID,
        orderName: updatedOrderRows.ORDER_NAME,
        placedDate: updatedOrderRows.PLACED_DATE,
        approvedDate: updatedOrderRows.APPROVED_DATE,
        statusId: updatedOrderRows.STATUS_ID,
        currencyUomId: updatedOrderRows.CURRENCY_UOM_ID,
        productStoreId: updatedOrderRows.PRODUCT_STORE_ID,
        salesChannelEnumId: updatedOrderRows.SALES_CHANNEL_ENUM_ID,
        grandTotal: updatedOrderRows.GRAND_TOTAL,
        completedDate: updatedOrderRows.COMPLETED_DATE,
      };

      // Send the updated order details in the response
      res.status(200).json({ message: 'Order updated successfully', order: updatedOrder });
    } else {
      res.status(404).json({ message: 'Order not found' });
    }
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Error updating order' });
  }
};


exports.getAllOrders = async (req, res) => {
  try {
    const allOrders = await fetchAllOrdersFromDatabase();
    console.log(allOrders)
    // Format the response according to the provided schema
    const formattedOrders = await Promise.all(
      allOrders.map(async (order) => {
        const orderParts = await fetchOrderParts(order.ORDER_ID);
        console.log(orderParts);

        const orderPartsDetails = await Promise.all(
          orderParts.map(async (orderPart) => {
            const orderItems = await fetchOrderItems(orderPart.ORDER_ID, orderPart.ORDER_PART_SEQ_ID);
            return {
              orderPartSeqId: orderPart.ORDER_PART_SEQ_ID,
              partName: orderPart.PART_NAME,
              facilityId: orderPart.FACILITY_ID,
              shipmentMethodEnumId: orderPart.SHIPMENT_METHOD_ENUM_ID,
              partStatusId: orderPart.STATUS_ID,
              partTotal: orderPart.PART_TOTAL,
              item_details: orderItems,
            };
          })
        );
        const customerDetails = await fetchCustomerDetails(orderParts[0].CUSTOMER_PARTY_ID);

        return {
          orderId: order.ORDER_ID,
          orderName: order.ORDER_NAME,
          currencyUom: order.CURRENCY_UOM_ID,
          salesChannelEnumId: order.SALES_CHANNEL_ENUM_ID,
          statusId: order.STATUS_ID,
          placedDate: order.PLACED_DATE,
          grandTotal: order.GRAND_TOTAL,
          customer_details: customerDetails,
          order_parts: orderPartsDetails,
        };
      })
    );

    res.status(200).json({ orders: formattedOrders });
  } catch (error) {
    console.error(error);
    res.status(500).json({ status: false, message: 'Error fetching orders' });
  }
};

async function fetchAllOrdersFromDatabase() {
  try {
    const ordersRows = await fetchOrderHeader();
    const orders = ordersRows.map((order) => ({
      ORDER_ID: order.ORDER_ID,
      ORDER_NAME: order.ORDER_NAME,
      CURRENCY_UOM_ID: order.CURRENCY_UOM_ID,
      SALES_CHANNEL_ENUM_ID: order.SALES_CHANNEL_ENUM_ID,
      STATUS_ID: order.STATUS_ID,
      PLACED_DATE: order.PLACED_DATE,
      GRAND_TOTAL: order.GRAND_TOTAL,
    }));
    // console.log(orders);
    return orders;
  } catch (error) {
    console.error(error);
    throw error;
  }
}

async function fetchOrderHeader() {
  return queryAsync('SELECT * FROM order_header');
}

async function fetchOrderParts(orderId) {
  const orderPartsRows = await queryAsync('SELECT * FROM order_part WHERE ORDER_ID = ?', [orderId]);
  const orderParts = orderPartsRows.map((orderPart) => ({
    ORDER_ID:orderPart.ORDER_ID,
    ORDER_PART_SEQ_ID: orderPart.ORDER_PART_SEQ_ID,
    PART_NAME: orderPart.PART_NAME,
    FACILITY_ID: orderPart.FACILITY_ID,
    SHIPMENT_METHOD_ENUM_ID: orderPart.SHIPMENT_METHOD_ENUM_ID,
    STATUS_ID: orderPart.STATUS_ID,
    PART_TOTAL: orderPart.PART_TOTAL,
    CUSTOMER_PARTY_ID:orderPart.CUSTOMER_PARTY_ID
  }));
  // console.log(orderParts);
  return orderParts;
}

async function fetchOrderItems(orderId, orderPartSeqId) {
  const orderItemsRows = await queryAsync('SELECT * FROM order_item WHERE ORDER_ID = ? AND ORDER_PART_SEQ_ID = ?', [orderId, orderPartSeqId]);
  const orderItems = orderItemsRows.map((orderItem) => ({
    ORDER_ITEM_SEQ_ID: orderItem.ORDER_ITEM_SEQ_ID,
    PRODUCT_ID: orderItem.PRODUCT_ID,
    ITEM_DESCRIPTION: orderItem.ITEM_DESCRIPTION,
    QUANTITY: orderItem.QUANTITY,
    UNIT_AMOUNT: orderItem.UNIT_AMOUNT,
  }));
  console.log(orderItems);
  return orderItems;
}

async function fetchCustomerDetails(customerPartyId) {
  console.log(customerPartyId)
  const [customerDetailsRows] = await queryAsync('SELECT * FROM Person WHERE PARTY_ID = ?', [customerPartyId]);
  const customerDetails = {
    customerPartyId: customerDetailsRows.PARTY_ID,
    firstName: customerDetailsRows.FIRST_NAME,
    middleName: customerDetailsRows.MIDDLE_NAME,
    lastName: customerDetailsRows.LAST_NAME,
  };
  console.log(customerDetails);
  return customerDetails;
}

// Promisify the db.query method
function queryAsync(sql, params) {
  return new Promise((resolve, reject) => {
    db.query(sql, params, (error, result) => {
      if (error) {
        reject(error);
      } else {
        resolve(result);
      }
    });
  });
}

 // Helper function to generate a unique order ID 
 function generateOrderId() {
  return 'ORD_' + Math.floor(Math.random() * 1000000);
}

// Helper function to generate a unique order part seq ID 
function generateOrderPartSeqId() {
  return 'OP_' + Math.floor(Math.random() * 1000);
}

// Helper function to generate a unique order item seq ID 
function generateOrderItemSeqIdId() {
  return 'OI_' + Math.floor(Math.random() * 1000);
}

