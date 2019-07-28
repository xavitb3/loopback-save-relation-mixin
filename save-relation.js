const Promise = require("bluebird");

module.exports = (Model, options) => {
  const { relations } = options;

  Model.observe("before save", ctx => {
    const instance = ctx.instance || ctx.data;

    ctx.options.relations = relations
      .map(relation => ({
        name: relation,
        values:
          typeof instance[relation] === "function"
            ? instance[relation]()
            : instance[relation]
      }))
      .filter(({ values }) => typeof values !== "undefined");

    return Promise.resolve();
  });

  Model.observe(
    "after save",
    ({ instance, options: { relations }, isNewInstance }) => {
      return Promise.map(relations, relation =>
        updateRelatedModels({ instance, relation, isNewInstance })
      );
    }
  );

  function updateRelatedModels({ instance, relation, isNewInstance }) {
    const { modelTo, keyTo, type, modelThrough } = Model.relations[
      relation.name
    ];

    switch (type) {
      case "hasOne":
        return hasOne({
          modelTo,
          keyTo,
          isNewInstance,
          instance,
          relatedObject: relation.values
        });
      case "hasMany":
        return hasMany({
          modelTo,
          modelThrough,
          keyTo,
          isNewInstance,
          instance,
          relationName: relation.name,
          relatedObjects: relation.values
        });
    }
  }

  function hasOne({ modelTo, keyTo, isNewInstance, instance, relatedObject }) {
    return isNewInstance
      ? modelTo.upsert({
          ...relatedObject,
          [keyTo]: instance.id
        })
      : modelTo
          .findOne({ where: { [keyTo]: instance.id } })
          .then(currentRelatedInstance =>
            objectIsEmpty(relatedObject)
              ? modelTo.destroyById(currentRelatedInstance.id)
              : modelTo.upsert({
                  ...currentRelatedInstance.toObject(),
                  ...relatedObject,
                  [keyTo]: instance.id
                })
          );
  }

  function hasMany(args) {
    return args.isNewInstance
      ? upsertRelatedObjects(args)
      : removeRelatedObjects(args).then(() => upsertRelatedObjects(args));
  }

  function upsertRelatedObjects({
    modelTo,
    modelThrough,
    keyTo,
    instance,
    relationName,
    relatedObjects
  }) {
    return Promise.map(relatedObjects, relatedObject =>
      typeof modelThrough !== "undefined"
        ? relatedObject.id
          ? instance[relationName].add(relatedObject.id)
          : instance[relationName].create(relatedObject)
        : modelTo.upsert({ ...relatedObject, [keyTo]: instance.id })
    );
  }

  function removeRelatedObjects({
    modelTo,
    modelThrough,
    instance,
    relationName,
    relatedObjects
  }) {
    return Model.findById(instance.id, { include: relationName })
      .then(currentInstance =>
        currentInstance[relationName]().filter(
          currentRelatedInstance =>
            !relatedObjects.some(
              relatedObject => relatedObject.id === currentRelatedInstance.id
            )
        )
      )
      .then(removedRelatedInstances =>
        Promise.map(removedRelatedInstances, ({ id }) =>
          typeof modelThrough !== "undefined"
            ? instance[relationName].remove(id)
            : modelTo.deleteById(id)
        )
      );
  }

  function objectIsEmpty(obj) {
    return Object.entries(obj).length === 0 && obj.constructor === Object;
  }
};
