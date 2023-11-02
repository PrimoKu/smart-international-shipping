const GroupOrder = require("../models/GroupOrder");
const { ObjectId } = require('mongoose').Types;

const getAll = async () => {
    const groupOrders = await GroupOrder.find().sort({ 'updatedAt': -1 }).exec();
    return groupOrders;
}

const getAllWithUser = async (user_id) => {
    const groupOrders = await GroupOrder.find({manager_id: user_id}).sort({ 'updatedAt': -1 }).exec();
    return groupOrders;
}

const create = async (manager_id, name, country) => {
    const groupOrders = await GroupOrder.create({ manager_id, name, country });
    return groupOrders;
}

const get = async (id) => {
    const groupOrder = await GroupOrder.findById(id);
    return groupOrder;
}

const update = async (id, data) => {
    const groupOrder = await GroupOrder.findByIdAndUpdate(id, data, { new: true });
    return groupOrder;
}

const getWithDetails = async (id) => {
    const groupOrderId = new ObjectId(id);
    const results = await GroupOrder.aggregate([
        {
            $match: { _id: groupOrderId }
        },
        {
            $lookup: {
                from: 'users', 
                localField: 'manager_id',
                foreignField: '_id',
                as: 'manager' 
            }
        },
        {
            $unwind: '$manager' 
        },
        {
            $project: {
                name: 1,
                country: 1,
                deadline: 1,
                createdAt: 1,
                updatedAt: 1,
                __v: 1,
                order_ids: 1,
                'manager._id': 1,
                'manager.name': 1,
                'manager.email': 1
            }
        },
        {
            $lookup: {
                from: 'orders', 
                localField: 'order_ids',
                foreignField: '_id',
                as: 'orders' 
            }
        },
        {
            $unwind: {
                path: "$orders",
                preserveNullAndEmptyArrays: true
            }
        },
        {
            $lookup: {
                from: 'users', 
                localField: 'orders.user_id',
                foreignField: '_id',
                as: 'orders.user' 
            }
        },
        {
            $group: {
                _id: "$_id",
                manager: { $first: "$manager" },
                name: { $first: "$name" },
                country: { $first: "$country" },
                deadline: { $first: "$deadline" },
                status: { $first: "$status" },
                createdAt: { $first: "$createdAt" },
                updatedAt: { $first: "$updatedAt" },
                __v: { $first: "$__v" },
                orders: { $push: "$orders" },
                users: { $addToSet: { $arrayElemAt: ["$orders.user", 0] } }
            }
        }
    ]);
    const groupOrder = results && results.length ? results[0] : null;

    return groupOrder;
}

const getWithManager = async (id) => {
    const groupOrderId = new ObjectId(id);
    const results = await GroupOrder.aggregate([
        {
            $match: { _id: groupOrderId }
        },
        {
            $lookup: {
                from: 'users', 
                localField: 'manager_id',
                foreignField: '_id',
                as: 'manager' 
            }
        }
    ]);
    const groupOrder = results && results.length ? results[0] : null;

    return groupOrder;
}

const getOrdersWhereUserIsNotManager = async (user_id) => {
    const userId = new ObjectId(user_id);

    const results = await GroupOrder.aggregate([
        {
            $lookup: {
                from: 'orders',
                localField: 'order_ids',
                foreignField: '_id',
                as: 'associatedOrders'
            }
        },
        {
            $match: {
                manager_id: { $ne: userId },
                'associatedOrders.user_id': userId
            }
        },
        {
            $project: {
                name: 1,
                country: 1,
                deadline: 1,
                createdAt: 1,
                updatedAt: 1,
                order_ids: 1,
            }
        }
    ]);

    return results;
}

module.exports = {
    getAll,
    create,
    get,
    update,
    getWithDetails,
    getWithManager,
    getOrdersWhereUserIsNotManager,
    getAllWithUser
}