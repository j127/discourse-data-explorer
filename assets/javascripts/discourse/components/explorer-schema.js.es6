import debounce from "discourse/lib/debounce";

export default Ember.Component.extend({
  actions: {
    expandSchema() {
      this.set("hideSchema", false);
    },
    collapseSchema() {
      this.set("hideSchema", true);
    }
  },

  transformedSchema: function() {
    const schema = this.get("schema");

    for (let key in schema) {
      if (!schema.hasOwnProperty(key)) {
        continue;
      }

      schema[key].forEach(function(col) {
        const notes_components = [];
        if (col.primary) {
          notes_components.push("primary key");
        }
        if (col.is_nullable) {
          notes_components.push("null");
        }
        if (col.column_default) {
          notes_components.push("default " + col.column_default);
        }
        if (col.fkey_info) {
          notes_components.push("fkey " + col.fkey_info);
        }
        if (col.denormal) {
          notes_components.push("denormal " + col.denormal);
        }
        const notes = notes_components.join(", ");

        if (notes) {
          col.notes = notes;
        }

        if (col.enum || col.column_desc) {
          col.havepopup = true;
        }

        col.havetypeinfo = !!(col.notes || col.enum || col.column_desc);
      });
    }
    return schema;
  }.property("schema"),

  rfilter: function() {
    if (!Em.isBlank(this.get("filter"))) {
      return new RegExp(this.get("filter"));
    }
  }.property("filter"),

  filterTables: function(schema) {
    let tables = [];
    const filter = this.get("rfilter"),
      haveFilter = !!filter;

    for (let key in schema) {
      if (!schema.hasOwnProperty(key)) {
        continue;
      }
      if (!haveFilter) {
        tables.push({
          name: key,
          columns: schema[key],
          open: false
        });
        continue;
      }

      // Check the table name vs the filter
      if (filter.source === key || filter.source + "s" === key) {
        tables.unshift({
          name: key,
          columns: schema[key],
          open: haveFilter
        });
      } else if (filter.test(key)) {
        // whole table matches
        tables.push({
          name: key,
          columns: schema[key],
          open: haveFilter
        });
      } else {
        // filter the columns
        let filterCols = [];
        schema[key].forEach(function(col) {
          if (filter.source === col.column_name) {
            filterCols.unshift(col);
          } else if (filter.test(col.column_name)) {
            filterCols.push(col);
          }
        });
        if (!Em.isEmpty(filterCols)) {
          tables.push({
            name: key,
            columns: filterCols,
            open: haveFilter
          });
        }
      }
    }
    return tables;
  },

  triggerFilter: debounce(function() {
    this.set(
      "filteredTables",
      this.filterTables(this.get("transformedSchema"))
    );
    this.set("loading", false);
  }, 500).observes("filter"),

  setLoading: function() {
    this.set("loading", true);
  }.observes("filter"),

  init() {
    this._super();
    this.set("loading", true);
    this.triggerFilter();
  }
});
