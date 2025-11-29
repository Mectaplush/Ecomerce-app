const express = require('express');
const router = express.Router();

const { authUser, authAdmin } = require('../auth/checkAuth');
const { asyncHandler } = require('../auth/checkAuth');

const controllerContact = require('../controllers/contact.controller');

router.post('/api/create-contact', authUser, asyncHandler(controllerContact.createContact));
router.get('/api/get-contacts', authAdmin, asyncHandler(controllerContact.getContacts));
module.exports = router;
