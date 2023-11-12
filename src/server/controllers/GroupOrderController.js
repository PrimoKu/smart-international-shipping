const asyncHandler = require("express-async-handler");
const GroupOrder = require("../models/GroupOrder");
const groupOrderRepo = require("../repositories/GroupOrderRepository");
const userRepo = require("../repositories/UserRepository");
const orderRepo = require("../repositories/OrderRepository");
const notificationRepo = require("../repositories/NotificationRepository");
const { OrderStatus, OrderStatusList } = require("../enums/OrderStatusEnums");
const { UserRole, UserRoleList } = require("../enums/UserRoleEnums");
const { sendNotificationToUser } = require("../socketManager");

class GroupOrderController {

    //@des Get all group orders
    //@route GET /api/groupOrders
    //@access private
    getGroupOrders = asyncHandler(async (req, res) => {
        if (req.user.role == UserRole.SHIPPER) {
            const groupOrder = await groupOrderRepo.getAll();
            return res.status(200).json(groupOrder);
        } else {
            const groupOrders_managed = await groupOrderRepo.getAllWithUser(req.user.id);
            const groupOrders_joined = await groupOrderRepo.getOrdersWhereUserIsNotManager(req.user.id);
            return res.status(200).json({ managed: groupOrders_managed, joined: groupOrders_joined });
        }
    });

    //@des Create new group order
    //@route POST /api/groupOrders
    //@access private
    createGroupOrder = asyncHandler(async (req, res) => {
        const { name, country } = req.body;
        let groupOrder;
        try {
            groupOrder = await groupOrderRepo.create(req.user.id, name, country);
            if (groupOrder) {
                return res.status(201).json(groupOrder);
            } else {
                return res.status(442).json({ message: "Create order failed!" });
            }
        } catch (error) {
            res.status(500);
            throw new Error("Server Error!");
        }
    });

    //@des Get group order by id
    //@route GET /api/groupOrders/:id
    //@access private
    getGroupOrder = asyncHandler(async (req, res) => {
        try {
            const groupOrder = await groupOrderRepo.getWithDetails(req.params.id);
            if (!groupOrder) {
                return res.status(404).json({ message: "Group Order not found!" });
            }
            if (!groupOrder.users.some(user => user._id.toString() === req.user.id) && groupOrder.manager._id.toString() !== req.user.id) {
                return res.status(403).json({ message: "User don't have permission to update other user's order" });
            }
            res.status(200).json({
                GroupOrder: groupOrder,
                OrderStatusList: OrderStatusList
            });
        } catch (error) {
            console.error(error);
            res.status(500);
            throw new Error("Server Error!");
        }
    });

    //@des Update group order by id
    //@route PUT /api/groupOrders/:id
    //@access private
    updateGroupOrder = asyncHandler(async (req, res) => {
        const groupOrder = await groupOrderRepo.get(req.params.id);
        try {
            if (!groupOrder) {
                return res.status(404).json({ message: "Group Order not found!" });
            }
            if (groupOrder.manager_id.toString() !== req.user.id) {
                return res.status(403).json({ message: "User don't have permission to update other user's order" });
            }
            const updatedGroupOrder = await groupOrderRepo.update(req.params.id, req.body);
            res.status(200).json(updatedGroupOrder);

        } catch (error) {
            res.status(500);
            throw new Error("Server Error!");
        }
    });

    //@des Invite user to group order
    //@route POST /api/groupOrders/invite/:id
    //@access private
    inviteToGroupOrder = asyncHandler(async (req, res) => {
        const sender = req.user;
        const groupOrder = await groupOrderRepo.get(req.params.id);
        const { userEmail } = req.body;
        let notification;
        try {
            const receiver = await userRepo.getByEmail(userEmail);
            if (!receiver) { return res.status(404).json({ message: "User not found!" }); }

            const message = `${sender.name} invited you to join the group: ${groupOrder.name} \n http://localhost:3000/admin/groupOrder/${groupOrder.id}`;
            notification = await notificationRepo.create(receiver.id, message);
            if (notification) {
                res.status(201).json({ notification });
            } else {
                return res.status(442).json({ message: "Create notification failed!" });
            }
            sendNotificationToUser(receiver.id, message);
        } catch (error) {
            console.log(error);
            res.status(500);
            throw new Error("Server Error!");
        }
    });

    //@des Add user to group order
    //@route PUT /api/groupOrders/add/:id
    //@access private
    addToGroupOrder = asyncHandler(async (req, res) => {
        const user_id = req.user.id;
        const groupOrder = await groupOrderRepo.get(req.params.id);
        if (!groupOrder) {
            return res.status(404).json({ message: "Group Order not found!" });
        }
        try {
            const updatedGroupOrder = await groupOrderRepo.update(
                req.params.id,
                { $push: { user_ids: user_id } },
                { new: true }
            );
            res.status(200).json(updatedGroupOrder);
        } catch (error) {
            console.error(error); // Log the error for debugging purposes
            res.status(500).json({ message: "Server Error!" });
        }
    });

    //@des Delete a joiner from a group order
    //@route DELETE /api/groupOrders/delete/:id/:joinerId
    //@access private
    deleteFromGroupOrder = asyncHandler(async (req, res) => {
        const groupId = req.params.id;
        const joinerId = req.params.joinerId;

        try {
            // Find the group order by its ID.
            const groupOrder = await groupOrderRepo.get(groupId);
            const orders = await orderRepo.getByGroupId(groupId);

            if (!groupOrder) {
                return res.status(404).json({ message: "Group Order not found!" });
            }

            // Remove the joiner from the list of users.
            const updatedUsers = groupOrder.user_ids.filter(user => user._id.toString() !== joinerId);
            //const updatedOrders = orders.user_ids.filter(user => user._id.toString() !== joinerId);
            const updatedGroupOrder = await groupOrderRepo.update(req.params.id, {user_ids: updatedUsers});

            //const updatedOrders = groupOrder.order_ids.filter(order => order.toString() !== joinerId);

            res.status(200).json(updatedGroupOrder);
        } catch (error) {
            console.error(error);
            res.status(500).json({ message: "Server Error!" });
        }
    });

}

module.exports = GroupOrderController;