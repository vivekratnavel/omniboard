import RunsModel from "./models/runs";
import OmniboardColumnsModel from "./models/omniboard.metric.columns";

const PROBABLY_DEAD_TIMEOUT = 120000;

const getAllColumnsFromQuery = (query) => {
  let columns = new Set();
  if (Object.keys(query).length && !Array.isArray(query) && typeof query !== 'string') {
    columns = Object.keys(query).reduce((result, current) => {
      if (Array.isArray(query[current])) {
        query[current].forEach(item => {
          result = new Set([...result, ...getAllColumnsFromQuery(item)]);
        });
      } else if (current[0] !== '$') {
        // add key to result if its not an operator
        // that starts with a '$'. Ex. '$and', '$or', '$eq'
        result.add(current);
      }
      return result;
    }, new Set());
  }
  return columns;
};

/**
 * Check if array includes any parent of the key
 * Ex: array(config.path)
 * key: config.path.path1 -> true
 * key: config.path.path1.path2 -> true.
 *
 * @param array
 * @param key
 * @return boolean if given array includes any parent of key.
 */
const deepIncludes = (array, key) => {
  const keyArray = key.split('.');
  let keyToCheck;
  return keyArray.some(subKey => {
    keyToCheck = keyToCheck ? `${keyToCheck}.${subKey}` : subKey;
    return array.includes(keyToCheck);
  });
};

export default function (databaseConn, runsCollectionName) {
  return {
    getRunsResponse(req, res, next, id = null, isCount = false) {
      const limit = req.query.limit || 200; // Set default limit to 200
      const skip = req.query.skip;
      const sort_by = req.query.sort_by;
      const order_by = Number(req.query.order_by) || -1; // Default to DESC order sort
      let select = req.query.select;
      const distinct = req.query.distinct;
      const filterQuery = req.query.query;
      let parsedFiltersQuery = {};
      const queryExecutionStartTime = new Date();
      try {
        parsedFiltersQuery = filterQuery && JSON.parse(filterQuery);
      } catch(e) {
        if (e instanceof SyntaxError) {
          return res.status(500).send('Error: Invalid JSON in query. ' + e.message);
        }
      }

      if (distinct) {
        RunsModel(databaseConn, runsCollectionName).distinct(distinct, function (err, result) {
          if (err) return next(err);
          res.status(200).send(result);
        });
      } else {
        // Get all custom metric columns
        OmniboardColumnsModel(databaseConn).find().exec(function (err, metricColumnsResponse) {
          if (err) return next(err);
          const metricColumnNames = metricColumnsResponse.map(column => column.metric_name);
          const customMetricColumnNames = metricColumnsResponse.map(column => column.name);
          const distinctMetricColumnNames = [...new Set(metricColumnNames)];
          // Ignore select for count query
          if (isCount) {
            select = null;
          }
          const selectArray = select ? select.split(',') : [];
          const projection = selectArray.reduce((result, column) => {
            result[column] = 1;
            return result;
          }, {});

          const areFiltersPresent = filterQuery && Object.keys(parsedFiltersQuery).length;
          let columnsWithFilters = new Set();

          // Construct the aggregate pipeline for Runs collection
          const aggregatePipeline = [];
          const projectionsToAdd = {
            "$addFields": {}
          };
          const projectionsToRemove = {
            "$project": {}
          };

          if (Number(id)) {
            aggregatePipeline.push({"$match": {"_id": Number(id)}});
          }

          // Include all the columns present in filter query
          // to projection
          if (areFiltersPresent) {
            columnsWithFilters = getAllColumnsFromQuery(parsedFiltersQuery);
            columnsWithFilters.forEach(column => {
              // Only if there is some projection, we need to add required columns
              // to projection. If not, by default all columns will be available.
              // Also, check if none of the parent projections are already included.
              // Ex: config.train.batch_size filter while config.train is already part of the projection. (#205)
              if (selectArray.length > 0 && !deepIncludes(selectArray, column)) {
                projection[column] = 1;
                projectionsToRemove.$project[column] = 0;
              }
            });
          }

          const selectAndFilterProjections = [...selectArray, ...columnsWithFilters];
          const metricColumnProjectionRequired = selectAndFilterProjections.some(col => customMetricColumnNames.includes(col));
          const isDurationRequired = selectAndFilterProjections.includes('duration');
          const isStatusRequired = selectAndFilterProjections.includes('status');

          if (metricColumnProjectionRequired) {
            // Add info.metrics to projection if not already present
            if (selectArray.length > 0 && !selectArray.includes('info')) {
              projection['info.metrics'] = 1;
            }
          }

          // if duration or status is included in select query or filter query,
          // then both start_time and heartbeat are required to calculate duration and status.
          if (isDurationRequired || isStatusRequired) {
            if (selectArray.length > 0 && !selectArray.includes('start_time')) {
              projection['start_time'] = 1;
              projectionsToRemove.$project['start_time'] = 0;
            }
            if (selectArray.length > 0 && !selectArray.includes('heartbeat')) {
              projection['heartbeat'] = 1;
              projectionsToRemove.$project['heartbeat'] = 0;
            }
          }

          if (isDurationRequired) {
            projectionsToAdd.$addFields['duration'] = {"$subtract": ["$heartbeat", "$start_time"]};
            if (!selectArray.includes('duration')) {
              projectionsToRemove.$project['duration'] = 0;
            }
          }

          if (isStatusRequired) {
            // Compute if a running experiment is probably dead.
            // We assume its probably dead if `current_time - heartbeat > 2hrs`
            const now = new Date();
            projectionsToAdd.$addFields['status'] = {
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
            };
            if (!selectArray.includes('status')) {
              projectionsToRemove.$project['status'] = 0;
            }
          }

          if (Object.keys(projection).length) {
            aggregatePipeline.push({
              "$project": projection
            });
          }

          if (Object.keys(projectionsToAdd.$addFields).length) {
            aggregatePipeline.push(projectionsToAdd);
          }

          const isFilterRequiredOnMetricColumn = customMetricColumnNames.some(metricColumnName =>
                                                                              columnsWithFilters.has(metricColumnName));

          // Apply filters
          // if there are no customMetricColumns are involved
          if (areFiltersPresent && !isFilterRequiredOnMetricColumn) {
            aggregatePipeline.push({
              "$match": parsedFiltersQuery
            });
          }

          // Apply sorting
          // As an optimization, we can apply sort at this stage of the
          // pipeline if sorting is enabled on any field other than
          // custom metric columns.
          if (sort_by && !customMetricColumnNames.includes(sort_by) && !isCount) {
            aggregatePipeline.push({
              "$sort": {
                [sort_by]: order_by
              }
            });
          }

          if (!isCount && (!sort_by || (sort_by && !customMetricColumnNames.includes(sort_by)))) {
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
                "path": "$info.metrics",
                "preserveNullAndEmptyArrays" : true
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
                      "$let": {
                        "vars": {
                          "metric_name": {
                            // Replace dots in metric names to "_"
                            // Since mongodb doesn't support dot notation in field names
                            "$reduce": {
                              "input": {"$split": ["$metrics.name", "."]},
                              "initialValue": "",
                              "in": {
                                "$concat": [
                                  "$$value",
                                  {"$cond": [{"$eq": ["$$value", ""]}, "", "_"]},
                                  "$$this"]
                              }
                            }
                          }
                        },
                        "in": {
                          "$cond": [
                            {
                              "$gt": [
                                "$metrics",
                                null
                              ]
                            },
                            {
                              "k": "$$metric_name",
                              "v": "$metrics"
                            },
                            {
                              "k": "empty",
                              "v": ""
                            }
                          ]
                        }
                      }
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
              if (selectAndFilterProjections.includes(metricColumn.name)) {
                const aggregate = `$${metricColumn.extrema}`;
                const lastn = metricColumn.lastn;
                // Replace dots in metric name with "_"
                const metricName = metricColumn.metric_name.replace(/\./g,'_');
                const metricValues = `$metrics.${metricName}.values`;

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
                } else if (metricColumn.extrema === 'last_avg') {
                    aggregatePipeline.push({
                    "$addFields": {
                      [metricColumn.name]: {
                        "$cond": {
                          "if": {"$and": [{"$isArray": metricValues}, {"$size": metricValues}]},
                          "then": {
                            "$avg": { "$slice": [ metricValues, -lastn ] }
                          },
                          "else": null
                        }
                      }
                    }
                  });
                }
                 else {
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
          } // end if metricColumnProjectionRequired

          // Apply filters if customMetricColumns are involved
          if (areFiltersPresent && isFilterRequiredOnMetricColumn) {
            aggregatePipeline.push({
              "$match": parsedFiltersQuery
            });
          }

          if (Object.keys(projectionsToRemove.$project).length) {
            aggregatePipeline.push(projectionsToRemove);
          }

          if (isCount) {
            aggregatePipeline.push({
              "$count": 'count'
            });
          } else {
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
          }

          const query = RunsModel(databaseConn, runsCollectionName).aggregate(
            aggregatePipeline
          ).allowDiskUse(true);

          query.exec(function (error, result) {
            if (error) return next(error);
            console.log('Query took ' + (new Date() - queryExecutionStartTime)/1000 + ' seconds.');
            if (id && result.length) {
              res.json(result[0]);
            } else if (isCount) {
              const count = result.length && 'count' in result[0] ? result[0]['count'] : 0;
              res.json({count});
            } else {
              res.json(result);
            }
          });

        });
      }
    }
  };
};
