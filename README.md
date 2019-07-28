## Loopback save relation mixin

### What does this do?

It provides a way to save related models when creating records. 

For example if the model ApplicationUser `hasOne` Profile you will be able to send:

`PATCH /api/ApplicationUsers`

```json
{ 
  "email": "user1@gmail.com",
  "password": "123456",
  "profile": {
    "name": "user 1"
  } 
}
```

### How does this work?

First you must install this package through npm

```bash
$ npm install loopback-save-relation-mixin --save
```

Then you have to configure the file `model-config.json` to load the mixin.

```json
"mixins": [
  ...
  "../node_modules/loopback-save-relation-mixin",
  ...]
```

And finally you can configure your model so it enables saving a related model.

```json
{
  "name": "ApplicationUser",
  "base": "User",
  "idInjection": true,
  "options": {
    "validateUpsert": false
  },
  "mixins": {
    "SaveRelation": {
      "relations": ["profile", "orders", "projects", "tickets"]
    }
  },
  "relations": {
    "profile": {
      "type": "hasOne",
      "model": "Profile",
      "foreignKey": "userId"
    },
    "orders": {
      "type": "hasMany",
      "model": "Order",
      "foreignKey": "userId"
    },
    "projects": {
      "type": "hasMany",
      "model": "Project",
      "foreignKey": "userId",
      "through": "UserProject"
    },
    "tickets": {
      "type": "hasAndBelongsToMany",
      "model": "Ticket"
    }
  }
}
```

It works for: 

```
  the loopback saveRelation mixin
    given a hasOne relation type
      ✓ should be saved
      ✓ should be updated
      ✓ should be deletable by sending an empty object
      ✓ should be deletable by sending null
    given a hasMany relation type
      ✓ should be saved
      ✓ should be updated
      ✓ should able to remove one relatedObject
      ✓ should able to remove all the relatedObjects by sending null
      ✓ should able to remove all the relatedObjects by sending an empty array
      ✓ should be updatable and deletable in the same operation
    given a hasManyThrough relation type
      ✓ should create the relatedObjects if they do not exist in the database and save the relations
      ✓ should be saved if the related objects do exist in the database
      ✓ should be deletable
    given a hasAndBelongsToMany relation type
      ✓ should create the relatedObjects if they do not exist in the database and save the relations
      ✓ should be saved if the related objects do exist in the database
      ✓ should be deletable
```