export interface ObjectChunk {
  path: string;
  chunk: number | string | boolean | null | undefined;
}

/**
 * Goes over an Object and returns an array with all properties of it
 * @param obj
 * @param prefix
 */
export function generateObjectTree(obj: any, prefix: string = ""): string[] {
  if (!obj) return [];
  let keys = Object.keys(obj);

  keys = keys.map((k) => `${prefix}${k}`);

  let subkeys: string[] = [];
  Object.keys(obj).forEach((k) => {
    if (typeof obj[k] === "object") {
      subkeys.push(...generateObjectTree(obj[k], `${prefix}${k}.`));
    }
  });

  return [...keys, ...subkeys];
}

/**
 * Given a property path, get its value (or undefined)
 * @param propertyPath
 */
export function getPropertyValue(obj: any, propertyPath: string) {
  let properties = propertyPath.split(".");

  // Start at the root of the object, then go down
  let rootObject = obj;
  let value: any = undefined;
  for (let i = 0; i < properties.length; i++) {
    let key = properties[i];
    value = rootObject ? rootObject[key] : undefined;

    if (!value) {
      // Stop the for, acessing any more subproperties
      // will cause this to break
      break;
    }

    // Go one level down
    rootObject = rootObject[key];
  }

  return value;
}

/**
 * Sets a property on a given path. Modified the passed object!
 * @param obj
 * @param propertyPath
 * @param setValue
 */
export function setPropertyValue(
  obj: any,
  propertyPath: string,
  setValue: any
) {
  let properties = propertyPath.split(".");

  if (!obj) {
    obj = {};
  }

  // Start at the root of the object, then go down
  let rootObject = obj;
  for (let i = 0; i < properties.length; i++) {
    let currentKey = properties[i];
    let nextKey = properties[i + 1];

    if (!rootObject[currentKey]) {
      rootObject[currentKey] = {};
    }

    // If I'm not an object and I have more properties to come,
    // I must become one
    if (typeof rootObject[currentKey] !== "object" && nextKey) {
      rootObject[currentKey] = {};
    }

    if (i === properties.length - 1) {
      rootObject[currentKey] = setValue;
    } else {
      // Go one level down
      rootObject = rootObject[currentKey];
    }
  }

  return { ...obj };
}

export function getChanges(objectFrom: any, objectTo: any) {
  let allChangedChunks: ObjectChunk[] = [];

  let objectTreeFrom = generateObjectTree(objectFrom);
  let objectTreeTo = generateObjectTree(objectTo);

  let allProperties = Array.from(new Set([...objectTreeFrom, ...objectTreeTo]));

  // Remove properties that have subproperties
  // eg: a.b if there's an a.b.c

  allProperties = allProperties.filter(
    (propertyPath) =>
      !allProperties.find(
        // Find a property that it's not the property I'm at and
        // has part of it as being the entire property

        // Thus, this property is a.b and pp is, for example, a.b.c
        (pp) => pp.length > propertyPath.length && pp.includes(propertyPath)
      )
  );

  allProperties.forEach((propertyPath) => {
    let valueFrom = getPropertyValue(objectFrom, propertyPath);
    let valueTo = getPropertyValue(objectTo, propertyPath);

    if (valueFrom !== valueTo) {
      allChangedChunks.push({ path: propertyPath, chunk: valueTo });
    }
  });

  return allChangedChunks;
}
