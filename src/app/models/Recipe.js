const db = require("../../config/database")
const { date } = require("../../utils/date")
const File = require("../models/File")

module.exports = {
  create(data, loggedUser) {
    const query = `
      INSERT INTO recipes (
        chef_id,
        user_id,
        title,
        ingredients,
        preparation,
        information,
        created_at,
        updated_at
      ) VALUES ( $1, $2, $3, $4, $5, $6, $7, $8 )
      RETURNING ID
    `
    const values = [
      data.chef,
      loggedUser.id,
      data.title,
      typeof data.ingredients === "string"
        ? [data.ingredients]
        : data.ingredients,
      typeof data.preparation === "string"
        ? [data.preparation]
        : data.preparation,
      data.information,
      date(Date.now()).ISO,
      date(Date.now()).ISO,
    ]

    return db.query(query, values)
  },

  all() {
    return db.query(`
      SELECT DISTINCT ON (recipes.title) recipes.*, files.path AS image
      FROM recipes
      LEFT JOIN recipe_files ON (recipes.id = recipe_files.recipe_id)
      LEFT JOIN files ON (recipe_files.file_id = files.id)
      ORDER BY recipes.title
      `)
  },

  show(recipeID) {
    return db.query(
      `
      SELECT recipes.*, chefs.name AS author
      FROM recipes
      LEFT JOIN chefs ON (recipes.chef_id = chefs.id)
      WHERE recipes.id = $1
      `,
      [recipeID]
    )
  },

  files(recipeID) {
    return db.query(
      `
      SELECT files.id, files.name, files.path
      FROM files
      LEFT JOIN recipe_files ON(files.id = recipe_files.file_id)
      LEFT JOIN recipes ON(recipe_files.recipe_id = recipes.id)
      WHERE recipes.id = $1
    `,
      [recipeID]
    )
  },

  mostAccessed() {
    return db.query(`
      SELECT DISTINCT ON (recipes.id) recipes.*, files.path AS image, chefs.name AS author
      FROM recipes
      LEFT JOIN chefs ON (recipes.chef_id = chefs.id)
      LEFT JOIN recipe_files ON (recipes.id = recipe_files.recipe_id)
      LEFT JOIN files ON (recipe_files.file_id = files.id)
      ORDER BY recipes.id 
      LIMIT(6)
      `)
  },

  update(data) {
    const query = `
      UPDATE recipes SET
        title=($1),
        chef_id=($2),
        ingredients=($3),
        preparation=($4),
        information=($5)
      WHERE
        id = $6
    `

    const values = [
      data.title,
      data.chef,
      typeof data.ingredients === "string"
        ? [data.ingredients]
        : data.ingredients,
      typeof data.preparation === "string"
        ? [data.preparation]
        : data.preparation,
      data.information,
      data.id,
    ]

    return db.query(query, values)
  },

  async delete(recipeID) {
    await File.deleteRecipeImages(recipeID)
    return db.query(`DELETE FROM recipes WHERE id = $1`, [recipeID])
  },

  paginate(filter, offset) {
    let query = "",
      filterQuery = "",
      totalQuery = `(
          SELECT count (*) FROM recipes
        ) AS total`

    if (filter) {
      filterQuery = `
        WHERE recipes.title ILIKE '%${filter}%'
      `
      totalQuery = `(
        SELECT count(*) FROM recipes
        ${filterQuery}
      ) AS total`
    }

    query = `
      SELECT DISTINCT ON (recipes.title) recipes.*, ${totalQuery}, files.path AS image
      FROM recipes
      LEFT JOIN recipe_files ON (recipes.id = recipe_files.recipe_id)
      LEFT JOIN files ON (recipe_files.file_id = files.id)
      ${filterQuery}
      LIMIT 12
      OFFSET $1
    `

    return db.query(query, [offset])
  },
}
