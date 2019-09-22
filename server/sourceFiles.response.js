import RunsModel from "./models/runs";

export const getSourceFilesResponse = function (req, res, next) {
  const limit = req.query.limit; // Set default limit to 200
  const filterQuery = req.query.query;
  let parsedFiltersQuery = {};
  try {
    parsedFiltersQuery = filterQuery && JSON.parse(filterQuery);
  } catch (e) {
    if (e instanceof SyntaxError) {
      return res.status(500).send('Error: Invalid JSON in query. ' + e.message);
    }
  }

  const projection = ['_id', 'experiment'].reduce((result, column) => {
    result[column] = 1;
    return result;
  }, {});

  const areFiltersPresent = filterQuery && Object.keys(parsedFiltersQuery).length;

  // Construct the aggregate pipeline for Runs collection
  const aggregatePipeline = [{
    "$project": projection
  }];

  // Apply filters
  if (areFiltersPresent) {
    aggregatePipeline.push({
      "$match": parsedFiltersQuery
    });
  }

  if (limit && !isNaN(limit)) {
    aggregatePipeline.push({
      "$limit": Number(limit)
    });
  }

  aggregatePipeline.push({
    // Deconstruct sources array into several rows
    "$unwind": {
      "path": "$experiment.sources",
      "preserveNullAndEmptyArrays": true
    }
  });

  // Join fs.files collection
  aggregatePipeline.push({
    "$lookup": {
      "from": "fs.files",
      "let": {
        "source_file_id": {
          "$toObjectId": {
            "$arrayElemAt": [
              "$experiment.sources",
              1
            ]
          }
        }
      },
      "pipeline": [
        {
          "$match": {
            "$expr": {
              "$eq": [
                "$_id",
                "$$source_file_id"
              ]
            }
          }
        }
      ],
      "as": "files"
    }
  });

  // Group by _id
  aggregatePipeline.push({
    "$group": {
      "_id": "$_id",
      "files": {
        "$push": {
          "$arrayElemAt": [
            "$files",
            0
          ]
        }
      }
    }
  });

  const query = RunsModel.aggregate(
    aggregatePipeline
  ).allowDiskUse(true);

  query.exec(function (error, result) {
    if (error) return next(error);
    res.json(result);
  });
};