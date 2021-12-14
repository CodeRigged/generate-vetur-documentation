const { promisify } = require("util");
const fs = require("fs");
const glob = promisify(require("glob"));
const { parse } = require("vue-docgen-api");

// edit your directories here
const inputDir = "path/to/input/dir/**/*.vue";
const outputDir = "path/to/output/dir/**/*.vue";

const convertToKebabCase = str =>
  str
    .match(/[A-Z]{2,}(?=[A-Z][a-z]+[0-9]*|\b)|[A-Z]?[a-z]+[0-9]*|[A-Z]|[0-9]+/g)
    .map(x => x.toLowerCase())
    .join("-");

const listComponents = async () => {
  // Glob for your components.
  const files = await glob(inputDir);
  return files;
};

/**
 * Parses the component tags
 * @param {import('vue-docgen-api').ComponentDoc} component
 */
const parseTag = component => {
  const tag = {};
  if (component.props) {
    tag.attributes = component.props.map(prop => convertToKebabCase(prop.name));
  }
  tag.description = component.description || "No description.";

  return tag;
};

/**
 * Parses the component tags
 * @param {String} componentTag
 * @param {import('vue-docgen-api').ComponentDoc} component
 */
const parseAttributes = (componentTag, component) => {
  const props = {};
  component.props.forEach(prop => {
    const { name, description, type, defaultValue, required, values } = prop;
    const propName = convertToKebabCase(name);
    const propDoc = (props[`${componentTag}/${propName}`] = {});

    propDoc.description = `${description ? description : "No description"}. 
     Default value: ${defaultValue ? JSON.stringify(defaultValue.value) : "none"}. 
     Is ${required ? "required" : "not required"}.`;

    if (type) {
      propDoc.type = type.name.split("|");
    }
    if (values) {
      propDoc.options = prop.values;
    }
  });

  return props;
};

const parseDocs = components => {
  const tags = {};
  let attributes = {};
  components.forEach(component => {
    const componentName = component.displayName;
    const componentTag = convertToKebabCase(componentName);
    tags[componentTag] = parseTag(component);
    if (component.props) {
      attributes = { ...parseAttributes(componentTag, component), ...attributes };
    }
  });

  return [tags, attributes];
};

const generateDocumentation = async () => {
  const components = await listComponents();
  const componentDocsPromises = components.map(c => parse(c));
  const docs = await Promise.all(componentDocsPromises);
  const [tags, attributes] = parseDocs(docs);

  if (!fs.existsSync(outDir)) {
    fs.mkdirSync(outDir);
  }

  fs.writeFileSync(`${outDir}/tags.json`, JSON.stringify(tags, null, 2));
  fs.writeFileSync(`${outDir}/attributes.json`, JSON.stringify(attributes, null, 2));
};

generateDocumentation();
