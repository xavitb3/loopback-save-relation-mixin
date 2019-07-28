const deepEqualInAnyOrder = require("deep-equal-in-any-order");
const { expect, use } = require("chai");
use(deepEqualInAnyOrder);

const path = require("path");
const SIMPLE_APP = path.join(__dirname, "fixtures", "simple-app");
const app = require(path.join(SIMPLE_APP, "server/server.js"));

describe("the loopback saveRelation mixin", function(tap) {
  const { ApplicationUser, Profile, Order } = app.models;
  const profile = { name: "user 1" };
  const orders = [{ name: "order 1" }, { name: "order 2" }];
  const projects = [{ name: "project 1" }, { name: "project 2" }];

  beforeEach(() => resetDB());

  describe.skip("given a hasOne relation type", () => {
    it("should be saved", () =>
      retrieveUser(user.id).then(userInstance => {
        expect(userInstance.profile().name).to.equal("user 1");
      }));

    it("should be updated", () =>
      ApplicationUser.upsert({
        ...user.toObject(),
        profile: { name: "user 1 updated" }
      })
        .then(userInstance =>
          Promise.all([retrieveUser(userInstance.id), Profile.find()])
        )
        .then(([userInstance, profileInstances]) => {
          expect(userInstance.profile().name).to.equal("user 1 updated");
          expect(profileInstances.length).to.equal(1);
        }));

    it("should be deletable", () =>
      ApplicationUser.upsert({
        ...user.toObject(),
        profile: {}
      })
        .then(userInstance =>
          Promise.all([retrieveUser(userInstance.id), Profile.find()])
        )
        .then(([userInstance, profileInstances]) => {
          expect(userInstance.profile()).to.be.null;
          expect(profileInstances.length).to.equal(0);
        }));
  });

  describe.skip("given a hasMany relation type", () => {
    it("should be saved", () =>
      retrieveUser(user.id).then(userInstance => {
        expect(getOrdersNames(userInstance.orders())).to.deep.equalInAnyOrder(
          orders
        );
      }));

    it("should be updated", () =>
      retrieveUser(user.id).then(userInstance =>
        ApplicationUser.upsert({
          ...userInstance.toObject(),
          orders: getOrdersWithDifferentNames(
            userInstance.toObject().orders,
            "order 1"
          )
        })
          .then(userInstance =>
            Promise.all([retrieveUser(userInstance.id), Order.find()])
          )
          .then(([userInstance, orderInstances]) => {
            expect(
              getOrdersNames(userInstance.orders())
            ).to.deep.equalInAnyOrder([
              { name: "updated order" },
              { name: "order 2" }
            ]);
            expect(orderInstances.length).to.equal(2);
          })
      ));

    it("should be deletable", () =>
      retrieveUser(user.id).then(userInstance =>
        ApplicationUser.upsert({
          ...userInstance.toObject(),
          orders: removeOrderWithName(userInstance.toObject().orders, "order 1")
        })
          .then(userInstance =>
            Promise.all([retrieveUser(userInstance.id), Order.find()])
          )
          .then(([userInstance, orderInstances]) => {
            expect(
              getOrdersNames(userInstance.orders())
            ).to.deep.equalInAnyOrder([{ name: "order 2" }]);
            expect(orderInstances.length).to.equal(1);
          })
      ));

    it("should be updatable and deletable in the same operation", () =>
      retrieveUser(user.id).then(userInstance =>
        ApplicationUser.upsert({
          ...userInstance.toObject(),
          orders: getOrdersWithDifferentNames(
            removeOrderWithName(userInstance.toObject().orders, "order 1"),
            "order 2"
          )
        })
          .then(userInstance =>
            Promise.all([retrieveUser(userInstance.id), Order.find()])
          )
          .then(([userInstance, orderInstances]) => {
            expect(
              getOrdersNames(userInstance.orders())
            ).to.deep.equalInAnyOrder([{ name: "updated order" }]);
            expect(orderInstances.length).to.equal(1);
          })
      ));
  });

  describe("given a hasManyThrough relation type", () => {
    it.only("should be saved", () =>
      createUser({ projects })
        .then(userInstance => retrieveUser(userInstance.id))
        .then(userInstance => {
          expect(
            getOrdersNames(userInstance.projects())
          ).to.deep.equalInAnyOrder(projects);
        }));

    it("should be updated", () =>
      retrieveUser(user.id).then(userInstance =>
        ApplicationUser.upsert({
          ...userInstance.toObject(),
          orders: getOrdersWithDifferentNames(
            userInstance.toObject().orders,
            "order 1"
          )
        })
          .then(userInstance =>
            Promise.all([retrieveUser(userInstance.id), Order.find()])
          )
          .then(([userInstance, orderInstances]) => {
            expect(
              getOrdersNames(userInstance.orders())
            ).to.deep.equalInAnyOrder([
              { name: "updated order" },
              { name: "order 2" }
            ]);
            expect(orderInstances.length).to.equal(2);
          })
      ));

    it("should be deletable", () =>
      retrieveUser(user.id).then(userInstance =>
        ApplicationUser.upsert({
          ...userInstance.toObject(),
          orders: removeOrderWithName(userInstance.toObject().orders, "order 1")
        })
          .then(userInstance =>
            Promise.all([retrieveUser(userInstance.id), Order.find()])
          )
          .then(([userInstance, orderInstances]) => {
            expect(
              getOrdersNames(userInstance.orders())
            ).to.deep.equalInAnyOrder([{ name: "order 2" }]);
            expect(orderInstances.length).to.equal(1);
          })
      ));

    it("should be updatable and deletable in the same operation", () =>
      retrieveUser(user.id).then(userInstance =>
        ApplicationUser.upsert({
          ...userInstance.toObject(),
          orders: getOrdersWithDifferentNames(
            removeOrderWithName(userInstance.toObject().orders, "order 1"),
            "order 2"
          )
        })
          .then(userInstance =>
            Promise.all([retrieveUser(userInstance.id), Order.find()])
          )
          .then(([userInstance, orderInstances]) => {
            expect(
              getOrdersNames(userInstance.orders())
            ).to.deep.equalInAnyOrder([{ name: "updated order" }]);
            expect(orderInstances.length).to.equal(1);
          })
      ));
  });

  function resetDB() {
    return new Promise((resolve, reject) => {
      app.datasources.db.automigrate(err => {
        if (err) reject(err);
        resolve();
      });
    });
  }

  function createUser({ profile, orders, projects }) {
    return ApplicationUser.create({
      email: "user1@gmail.com",
      password: "123456",
      profile,
      orders,
      projects
    });
  }

  function retrieveUser(id) {
    return ApplicationUser.findById(id, {
      include: ["profile", "orders", "projects"]
    });
  }

  function getOrdersNames(orders) {
    return orders.map(order => ({ name: order.name }));
  }

  function getOrdersWithDifferentNames(orders, name) {
    return orders.map(order => ({
      ...order,
      name: order.name === name ? "updated order" : order.name
    }));
  }

  function removeOrderWithName(orders, name) {
    return orders.filter(order => order.name !== name);
  }
});
