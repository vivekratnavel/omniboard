# Usage

## Metric Columns

New metric columns can be added to display rolled up metric value (e.g., minimum validation loss, maximum training accuracy, etc.)
To be able to add a metric column, your experiments should track at-least one metric value. 
Check out [sacred documentation](https://sacred.readthedocs.io/en/latest/collected_information.html#metrics-api) for more info.

To add a new Metric Column:
- Click on `+/- Metric Columns` button located on the top right 
of the dashboard
- Click on `+ Add Column` button
- Give a name to the new column, select a metric from the list of options in the dropdown
and select `extrema` for the rollup
- Click `Apply`

![Adding Metrics Columns](https://raw.githubusercontent.com/vivekratnavel/omniboard/master/docs/assets/screenshots/adding-metrics.png)

Also, check out [How it works](https://vivekratnavel.github.io/omniboard/#/quick-start?id=metric-columns) documentation for more info on how `Metric Columns` are stored in Mongodb.

## Custom Columns

Nested configs can be expanded into separate columns by adding new custom column
in `Manage Custom Columns` dialog.

For instance, if you have the following config
```json
{
    "config": {
      "train" : {
        "batch_size":32,
        "epochs":100,
        "lr":0.01
      }
    }
}
```
Omniboard automatically adds a new column for `train` and displays the whole
object as its value `{"batch_size":32,"epochs":100,"lr":0.01}`. By adding a
new custom column, you can expand each of these nested configs into a separate column.

To add a new Custom Column:

- Click on Cog/Settings icon located on the top right corner of the dashboard
- Click on `+/- Custom Columns`
- Click on `+ Add Column` button
- Give a name to the new column and select a path from the list of options in the dropdown. You can also give a custom path that is not present in the dropdown. 
- Click `Apply`

![Manage Custom Columns](https://raw.githubusercontent.com/vivekratnavel/omniboard/master/docs/assets/screenshots/manage-custom-columns.png)

Also, check out [How it works](https://vivekratnavel.github.io/omniboard/#/quick-start?id=custom-columns) documentation for more info on how `Custom Columns` are stored in Mongodb.

## Download Source Files or Artifacts

To download `Source Files` or `Artifacts`, click on any row of experiment run
and then click on `Source Files` or `Artifacts` from the side menu.

![Source Files Viewer](https://raw.githubusercontent.com/vivekratnavel/omniboard/master/docs/assets/screenshots/source-file-view.png)

You can then choose to either `Download All` files or `Download` each file individually.

## Change Timezone

All the timestamps are stored in UTC timezone in database and Omniboard 
will try to guess the user timezone and set it as default timezone for 
`start_time`, `stop_time` and `heartbeat` columns. 

To change the default timezone:
- Click the `Cog` icon on the top right corner and select `Settings` from the menu

  ![Settings Menu](https://raw.githubusercontent.com/vivekratnavel/omniboard/master/docs/assets/screenshots/settings-menu.png)
 
- Select the desired timezone and save the settings

  ![Settings Timezone](https://raw.githubusercontent.com/vivekratnavel/omniboard/master/docs/assets/screenshots/settings-timezone.png)

## Delete an experiment run

To delete an unwanted experiment run, hover over its `Id` column and click on the delete icon as shown below.

![Delete Run](https://raw.githubusercontent.com/vivekratnavel/omniboard/master/docs/assets/screenshots/delete-run.png)

Click on `Delete` button in the confirmation dialog to delete the run from the database including its metrics, source files and artifacts.

## Add tags using configs

To add tags to an experiment programmatically, add a config with name `tags` as shown below:

```
@ex.config
def my_config():
    tags = ["tag_1", "tag_2"]
```

## Add notes using command line

To add notes to an experiment, Sacred has the ability to add a comment to a run through command line with -c option ([Sacred Doc](https://sacred.readthedocs.io/en/stable/command_line.html#comment)). 

The comment added via command line gets stored in MongoDB Runs collection as `meta.comment` and is displayed in Omniboard under `Notes` column.
To filter runs by `Notes` column, use `regex` as the operator in filter to perform a text search.
