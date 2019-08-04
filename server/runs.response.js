import RunsModel from "./models/runs";
import OmniboardColumnsModel from "./models/omniboard.columns";

const PROBABLY_DEAD_TIMEOUT = 120000;

export const getRunsResponse = function (req, res, next, id = null) {
  const limit = req.query.limit || 200; // Set default limit to 200
  const skip = req.query.skip;
  const sort_by = req.query.sort_by;
  const order_by = Number(req.query.order_by) || -1; // Default to DESC order sort
  const select = req.query.select;
  const distinct = req.query.distinct;

  if (distinct) {
    RunsModel.distinct(distinct, function (err, result) {
      if (err) return next(err);
      res.send(result);
    });
  } else {
    // Get all custom metric columns
    OmniboardColumnsModel.find().exec(function (err, metricColumnsResponse) {
      if (err) return next(err);
      const metricColumnNames = metricColumnsResponse.map(column => column.metric_name);
      const customMetricColumnNames = metricColumnsResponse.map(column => column.name);
      const distinctMetricColumnNames = [...new Set(metricColumnNames)];
      const selectArray = select.split(',');
      const metricColumnProjectionRequired = selectArray.some(col => customMetricColumnNames.includes(col));
      const projection = selectArray.reduce((result, column) => {
        result[column] = 1;
        return result;
      }, {});
      const isDurationRequired = selectArray.includes("duration");
      const isStatusRequired = selectArray.includes("status");

      // Construct the aggregate pipeline for Runs collection
      const aggregatePipeline = [];
      const projectionsToRemove = {
        "$project": {}
      };

      if (id) {
        aggregatePipeline.push({"$match": {"_id": Number(id)}});
      }

      if (metricColumnProjectionRequired) {
        // Add info.metrics to projection if not already present
        if (!selectArray.includes("info")) {
          projection['info.metrics'] = 1;
        }
      }

      // if duration is included in select query, then both start_time and heartbeat are required
      // to calculate duration.
      if (isDurationRequired) {
        projection['start_time'] = 1;
        projection['heartbeat'] = 1;
      }

      if (Object.keys(projection).length) {
        aggregatePipeline.push({
          "$project": projection
        });
      }

      const addFieldsToProjection = {};
      if (isDurationRequired) {
        addFieldsToProjection["duration"] = {"$subtract": ["$heartbeat", "$start_time"]};
      }

      if (isStatusRequired) {
        // Compute if a running experiment is probably dead.
        // We assume its probably dead if `current_time - heartbeat > 2hrs`
        const now = new Date();
        addFieldsToProjection["status"] = {
          "$cond": {
            "if": {
              "$and": [
                {"$eq": ["$status", "RUNNING"]},
                {
                  "$gt": [{
                    "$subtract": [
                      now,
                      {"$ifNull": ["$heartbeat", "$start_time"]}
                    ]
                  }, PROBABLY_DEAD_TIMEOUT]
                }
              ]
            },
            "then": "PROBABLY_DEAD",
            "else": "$status"
          }
        }
      }

      if (Object.keys(addFieldsToProjection).length) {
        aggregatePipeline.push({
          "$addFields": addFieldsToProjection
        });
      }

      // Apply sorting
      // As an optimization, we can apply sort at this stage of the
      // pipeline if sorting is enabled on any field other than
      // custom metric columns.
      if (sort_by && !customMetricColumnNames.includes(sort_by)) {
        aggregatePipeline.push({
          "$sort": {
            [sort_by]: order_by
          }
        });
      }

      if (!sort_by || (sort_by && !customMetricColumnNames.includes(sort_by))) {
        if (skip && !isNaN(skip)) {
          aggregatePipeline.push({
            "$skip": Number(skip)
          });
        }

        if (limit && !isNaN(limit)) {
          aggregatePipeline.push({
            "$limit": Number(limit)
          });
        }
      }

      if (metricColumnProjectionRequired) {
        aggregatePipeline.push({
            // Deconstruct metrics array into several rows
            "$unwind": {
              "path": "$info.metrics"
            }
          },
          {
            // Limit the unwinded metrics to only required metrics
            "$match": {
              "$expr": {
                "$and": [
                  {
                    "$in": [
                      "$info.metrics.name",
                      distinctMetricColumnNames
                    ]
                  }
                ]
              }
            }
          });

        // Join metrics collection
        aggregatePipeline.push({
          "$lookup": {
            "from": "metrics",
            "let": {
              "metric_id": {
                // $toObjectId is supported only for MongoDB versions > 4.0
                "$toObjectId": "$info.metrics.id"
              }
            },
            "pipeline": [
              {
                "$match": {
                  "$expr": {
                    "$and": [
                      {
                        "$eq": [
                          "$_id",
                          "$$metric_id"
                        ]
                      },
                      {
                        "$in": [
                          "$name",
                          distinctMetricColumnNames
                        ]
                      }
                    ]
                  }
                }
              }
            ],
            "as": "metrics"
          }
        });

        aggregatePipeline.push({
            "$addFields": {
              // $lookup returns an array. In this case, it will never return more than one element
              // in the array. So, take the first element.
              "metrics": {
                "$arrayElemAt": [
                  "$metrics",
                  0
                ]
              }
            }
          },
          {
            "$group": {
              "_id": "$_id",
              "metrics": {
                "$push": {
                  "$cond": [
                    {
                      "$gt": [
                        "$metrics",
                        null
                      ]
                    },
                    {
                      "k": "$metrics.name",
                      "v": "$metrics"
                    },
                    {
                      "k": "empty",
                      "v": ""
                    }
                  ]
                }
              },
              "runs": {
                "$first": "$$ROOT"
              }
            }
          },
          {
            "$addFields": {
              "runs.metrics": {
                "$arrayToObject": "$metrics"
              }
            }
          },
          {
            "$replaceRoot": {
              "newRoot": "$runs"
            }
          });

        // Remove metrics column from runs
        aggregatePipeline.push({
          "$project": {
            "runs.metrics": 0
          }
        });

        // For each custom metric column,
        // add a new field with its aggregate
        metricColumnsResponse.forEach(metricColumn => {
          if (selectArray.includes(metricColumn.name)) {
            const aggregate = `$${metricColumn.extrema}`;
            const metricValues = `$metrics.${metricColumn.metric_name}.values`;

            // Handle $last as a special case
            // to return the last element of the array
            if (metricColumn.extrema === 'last') {
              aggregatePipeline.push({
                "$addFields": {
                  [metricColumn.name]: {
                    "$cond": {
                      "if": {"$and": [{"$isArray": metricValues}, {"$size": metricValues}]},
                      "then": {
                        $arrayElemAt: [
                          metricValues,
                          {
                            "$subtract": [
                              {
                                "$size": metricValues
                              },
                              1
                            ]
                          }
                        ]
                      },
                      "else": null
                    }
                  }
                }
              });
            } else {
              aggregatePipeline.push({
                "$addFields": {
                  [metricColumn.name]: {
                    [aggregate]: metricValues
                  }
                }
              });
            }
          }
        });

        // Remove metrics column
        projectionsToRemove.$project['metrics'] = 0;

        // Remove info column from projection
        if (!selectArray.includes("info")) {
          projectionsToRemove.$project['info'] = 0;
        }
      } // end if metricColumnProjectionRequired

      // Remove start_time and heartbeat from projection if not required
      if (!selectArray.includes("start_time")) {
        projectionsToRemove.$project['start_time'] = 0;
      }

      if (!selectArray.includes("heartbeat")) {
        projectionsToRemove.$project['heartbeat'] = 0;
      }

      if (Object.keys(projectionsToRemove.$project).length) {
        aggregatePipeline.push(projectionsToRemove);
      }

      if (metricColumnProjectionRequired) {
        // Sort again because unwind and group
        // messes up with the sorting that was done initially
        if (sort_by) {
          aggregatePipeline.push({
            "$sort": {
              [sort_by]: order_by
            }
          });
        }
      }

      if (sort_by && customMetricColumnNames.includes(sort_by)) {
        if (skip && !isNaN(skip)) {
          aggregatePipeline.push({
            "$skip": Number(skip)
          });
        }

        if (limit && !isNaN(limit)) {
          aggregatePipeline.push({
            "$limit": Number(limit)
          });
        }
      }

      const query = RunsModel.aggregate(
        aggregatePipeline
      ).allowDiskUse(true);

      query.exec(function (error, result) {
        if (error) return next(error);
        if (id && result.length) {
          res.json(result[0]);
        } else {
          res.json(result);
        }
      });

    });
  }
};