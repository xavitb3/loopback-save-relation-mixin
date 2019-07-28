const deepEqualInAnyOrder = require("deep-equal-in-any-order");
const { expect, use } = require("chai");
use(deepEqualInAnyOrder);

const path = require("path");
const SIMPLE_APP = path.join(__dirname, "fixtures", "simple-app");
const app = require(path.join(SIMPLE_APP, "server/server.js"));

describe("the loopback saveRelation mixin", () => {
  const { ApplicationUser, Profile, Order, Project, Ticket } = app.models;
  const profile = { name: "user 1" };
  const orders = [{ name: "order 1" }, { name: "order 2" }];
  const projects = [{ name: "project 1" }, { name: "project 2" }];
  const tickets = [{ name: "ticket 1" }, { name: "ticket 2" }];

  beforeEach(() => resetDB());

  describe("given a hasOne relation type", () => {
    it("should be saved", () =>
      createUser({ profile })
        .then(userInstance => retrieveUser(userInstance.id))
        .then(userInstance => {
          expect(userInstance.profile().name).to.equal("user 1");
        }));

    it("should be updated", () =>
      createUser({ profile })
        .then(userInstance =>
          ApplicationUser.upsert({
            ...userInstance.toObject(),
            profile: { name: "user 1 updated" }
          })
        )
        .then(userInstance =>
          Promise.all([retrieveUser(userInstance.id), Profile.find()])
        )
        .then(([userInstance, profileInstances]) => {
          expect(userInstance.profile().name).to.equal("user 1 updated");
          expect(profileInstances.length).to.equal(1);
        }));

    it("should be deletable by sending an empty object", () =>
      deleteHasOne({}));

    it("should be deletable by sending null", () => deleteHasOne(null));

    function deleteHasOne(nextProfile) {
      return createUser({ profile })
        .then(userInstance =>
          ApplicationUser.upsert({
            ...userInstance.toObject(),
            profile: nextProfile
          })
        )
        .then(userInstance =>
          Promise.all([retrieveUser(userInstance.id), Profile.find()])
        )
        .then(([userInstance, profileInstances]) => {
          expect(userInstance.profile()).to.be.null;
          expect(profileInstances.length).to.equal(0);
        });
    }
  });

  describe("given a hasMany relation type", () => {
    it("should be saved", () =>
      createUser({ orders })
        .then(userInstance => retrieveUser(userInstance.id))
        .then(userInstance => {
          expect(getsNames(userInstance.orders())).to.deep.equalInAnyOrder(
            orders
          );
        }));

    it("should be updated", () =>
      createUser({ orders })
        .then(userInstance => retrieveUser(userInstance.id))
        .then(userInstance =>
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
              expect(getsNames(userInstance.orders())).to.deep.equalInAnyOrder([
                { name: "updated order" },
                { name: "order 2" }
              ]);
              expect(orderInstances.length).to.equal(2);
            })
        ));

    it("should able to remove one relatedObject", () =>
      deleteHasMany().then(([userInstance, orderInstances]) => {
        expect(getsNames(userInstance.orders())).to.deep.equalInAnyOrder([
          { name: "order 2" }
        ]);
        expect(orderInstances.length).to.equal(1);
      }));

    it("should able to remove all the relatedObjects by sending null", () =>
      deleteHasMany(null).then(([userInstance, orderInstances]) => {
        expect(userInstance.orders().length).to.equal(0);
        expect(orderInstances.length).to.equal(0);
      }));

    it("should able to remove all the relatedObjects by sending an empty array", () =>
      deleteHasMany([]).then(([userInstance, orderInstances]) => {
        expect(userInstance.orders().length).to.equal(0);
        expect(orderInstances.length).to.equal(0);
      }));

    it("should be updatable and deletable in the same operation", () =>
      createUser({ orders })
        .then(userInstance => retrieveUser(userInstance.id))
        .then(userInstance =>
          ApplicationUser.upsert({
            ...userInstance.toObject(),
            orders: getOrdersWithDifferentNames(
              removeWithName(userInstance.toObject().orders, "order 1"),
              "order 2"
            )
          })
            .then(userInstance =>
              Promise.all([retrieveUser(userInstance.id), Order.find()])
            )
            .then(([userInstance, orderInstances]) => {
              expect(getsNames(userInstance.orders())).to.deep.equalInAnyOrder([
                { name: "updated order" }
              ]);
              expect(orderInstances.length).to.equal(1);
            })
        ));

    function deleteHasMany(nextValue) {
      return createUser({ orders })
        .then(userInstance => retrieveUser(userInstance.id))
        .then(userInstance =>
          ApplicationUser.upsert({
            ...userInstance.toObject(),
            orders:
              typeof nextValue !== "undefined"
                ? nextValue
                : removeWithName(userInstance.toObject().orders, "order 1")
          }).then(userInstance =>
            Promise.all([retrieveUser(userInstance.id), Order.find()])
          )
        );
    }
  });

  describe("given a hasManyThrough relation type", () => {
    it("should create the relatedObjects if they do not exist in the database and save the relations", () =>
      createUser({ projects: [...projects] })
        .then(userInstance => retrieveUser(userInstance.id))
        .then(userInstance => {
          expect(getsNames(userInstance.projects())).to.deep.equalInAnyOrder(
            projects
          );
        }));

    it("should be saved if the related objects do exist in the database", () =>
      Project.create([...projects])
        .then(projectInstances =>
          createUser({ projects: [...projectInstances] })
        )
        .then(userInstance =>
          Promise.all([retrieveUser(userInstance.id), Project.find()])
        )
        .then(([userInstance, projectInstances]) => {
          expect(getsNames(userInstance.projects())).to.deep.equalInAnyOrder(
            projects
          );
          expect(projectInstances.length).to.equal(2);
        }));

    it("should be deletable", () =>
      Project.create([...projects])
        .then(projectInstances =>
          createUser({ projects: [...projectInstances] })
        )
        .then(userInstance => retrieveUser(userInstance.id))
        .then(userInstance =>
          ApplicationUser.upsert({
            ...userInstance.toObject(),
            projects: removeWithName(
              userInstance.toObject().projects,
              "project 1"
            )
          })
        )
        .then(userInstance =>
          Promise.all([retrieveUser(userInstance.id), Project.find()])
        )
        .then(([userInstance, projectInstances]) => {
          expect(getsNames(userInstance.projects())).to.deep.equalInAnyOrder([
            {
              name: "project 2"
            }
          ]);
          expect(projectInstances.length).to.equal(2);
        }));
  });

  describe("given a hasAndBelongsToMany relation type", () => {
    it("should create the relatedObjects if they do not exist in the database and save the relations", () =>
      createUser({ tickets: [...tickets] })
        .then(userInstance => retrieveUser(userInstance.id))
        .then(userInstance => {
          expect(getsNames(userInstance.tickets())).to.deep.equalInAnyOrder(
            tickets
          );
        }));

    it("should be saved if the related objects do exist in the database", () =>
      Ticket.create([...tickets])
        .then(ticketInstances => createUser({ tickets: [...ticketInstances] }))
        .then(userInstance =>
          Promise.all([retrieveUser(userInstance.id), Ticket.find()])
        )
        .then(([userInstance, ticketInstances]) => {
          expect(getsNames(userInstance.tickets())).to.deep.equalInAnyOrder(
            tickets
          );
          expect(ticketInstances.length).to.equal(2);
        }));

    it("should be deletable", () =>
      Ticket.create([...tickets])
        .then(ticketInstances => createUser({ tickets: [...ticketInstances] }))
        .then(userInstance => retrieveUser(userInstance.id))
        .then(userInstance =>
          ApplicationUser.upsert({
            ...userInstance.toObject(),
            tickets: removeWithName(userInstance.toObject().tickets, "ticket 1")
          })
        )
        .then(userInstance =>
          Promise.all([retrieveUser(userInstance.id), Ticket.find()])
        )
        .then(([userInstance, ticketInstances]) => {
          expect(getsNames(userInstance.tickets())).to.deep.equalInAnyOrder([
            {
              name: "ticket 2"
            }
          ]);
          expect(ticketInstances.length).to.equal(2);
        }));
  });

  function resetDB() {
    return new Promise((resolve, reject) => {
      app.datasources.db.automigrate(err => {
        if (err) reject(err);
        resolve();
      });
    });
  }

  function createUser(props) {
    return ApplicationUser.create({
      email: "user1@gmail.com",
      password: "123456",
      ...props
    });
  }

  function retrieveUser(id) {
    return ApplicationUser.findById(id, {
      include: ["profile", "orders", "projects", "tickets"]
    });
  }

  function getsNames(items) {
    return items.map(item => ({ name: item.name }));
  }

  function getOrdersWithDifferentNames(orders, name) {
    return orders.map(order => ({
      ...order,
      name: order.name === name ? "updated order" : order.name
    }));
  }

  function removeWithName(items, name) {
    return items.filter(item => item.name !== name);
  }
});
