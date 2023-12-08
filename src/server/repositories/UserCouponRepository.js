const UserCoupon = require("../models/UserCoupon");
const { ObjectId } = require('mongoose').Types;

const create = async (user_id, coupon_id) => {
    const userCoupon = await UserCoupon.create({ user_id, coupon_id });
    return userCoupon;
}

const getByUser = async (user_id) => {
    const userId = new ObjectId(user_id);
    const userCoupons = await UserCoupon.aggregate([
        { 
            $match: { user_id: userId } 
        },
        {
            $lookup: {
                from: 'coupons',
                localField: 'coupon_id',
                foreignField: '_id',
                as: 'coupons'
            }
        },
        { $unwind: '$coupons' },
        {
            $group: {
                _id: '$user_id',
                coupons: { $push: '$coupons' }
            }
        },
        {
            $project: {
                _id: 0,
                user_id: '$_id',
                coupons: 1
            }
        }
    ]);

    return userCoupons;
}

const getByBoth = async (user_id, coupon_id) => {
    const userCoupon = await UserCoupon.find({user_id: user_id, coupon_id: coupon_id});
    return userCoupon[0];
}

module.exports = {
    create,
    getByUser,
    getByBoth,
}