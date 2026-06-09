const { getCommunityDataByEmail } = require('./server');

['customer1@meghasmart.com','customer2@meghasmart.com','customer3@meghasmart.com','customer4@meghasmart.com','customer5@meghasmart.com','customer6@meghasmart.com'].forEach(email => {
  const comm = getCommunityDataByEmail(email);
  console.log(email, comm ? comm.devices.length : 'none');
});
