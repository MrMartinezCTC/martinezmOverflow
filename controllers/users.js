// import express from 'express';
// import bcrypt from 'bcrypt';
// import jwt from 'jsonwebtoken';
// import { User } from '../models/User.js';
// import { sendError } from '../utils/jsonresponse.js';
// import { errorWrap } from '../utils/errorHandling.js';
const express = require('express');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const { User } = require('../models/User');//no js extension
const { sendError } = require('../utils/jsonresponse');//no js extension
const { errorWrap } = require('../utils/errorHandling');//no js extension

const router = express.Router();

router.post('/signup', errorWrap(async (req, res) => {
    const user = new User({
        firstName: req.body.firstName,
        lastName: req.body.lastName,
        email: req.body.email,
        password: req.body.password
    });
    
    await user.validate();
    
    user.password = await bcrypt.hash(req.body.password, 10);
    
    await user.save();

    res.cookie(...setCookie(req.body.email));
    res.status(201).json(user);
}));


router.post('/login', errorWrap(async (req, res) => {
    let failure = false;

    const user = await User.findOne({ email: req.body.email });
    if (!user || !await passIsCorrect(req.body.password, user.password)) failure = true;

    if (failure) return sendError(res, 400, 'Invalid email/password');

    res.cookie(...setCookie(req.body.email));
    res.status(200).json({
        success: true,
    });
}));


router.get('/logout', errorWrap((req, res) => {
    res.clearCookie('mrCookie');

    res.status(200).json({
        success: true
    });
}));


router.post('/changeInfo', errorWrap(async (req, res) => {
    const user = req.user;
    if (!user) return sendError(res, 401, 'Must have an account to preform requested action.');
    
    const { firstName, lastName, email, password, newPassword, confirmPassword } = req.body;
    const passwordsArr = [password, newPassword, confirmPassword];

    if (passwordsArr.filter(pass => pass).length > 0) {
        if (!passwordsArr.every(pass => pass)) return sendError(res, 400, 'Must fill all three password fields to change password.');
        if (newPassword !== confirmPassword) return sendError(res, 400, 'Confirm password needs to be the same as new password');
        if (!await passIsCorrect(password, user.password)) return sendError(res, 400, 'Current password value is not correct.');
    }
    
    const userInfo = { firstName, lastName, email }, propsToUpdate = {};

    for (const key in userInfo) if (userInfo[key] && userInfo[key] !== user[key]) propsToUpdate[key] = userInfo[key];

    if (newPassword) propsToUpdate.password = await bcrypt.hash(newPassword, 10);

    await User.updateOne({ _id: user._id }, propsToUpdate, { runValidators: true });

    return res.status(204).json();
}));


async function passIsCorrect (passGuess, actualPass) {
    return await bcrypt.compare(passGuess, actualPass);
}


function setCookie(email) {
    return [
        'mrCookie',
        jwt.sign({ email }, process.env.SECRET, { expiresIn: '30d' }),
        {
            httpOnly: true,
            secure: true,
            sameSite: 'strict',
            maxAge: (new Date ()).getMilliseconds() + 1000 * 86_400 * 30
        }
    ];
}

// export default router;
module.exports = router;
