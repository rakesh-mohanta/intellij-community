// Copyright 2000-2019 JetBrains s.r.o. Use of this source code is governed by the Apache 2.0 license that can be found in the LICENSE file.
import {InputData, Item, XYChartManager} from "./core"
import * as am4charts from "@amcharts/amcharts4/charts"
import * as am4core from "@amcharts/amcharts4/core"

// https://github.com/almende/vis/blob/master/examples/timeline/dataHandling/dataSerialization.html
// do not group because it makes hard to understand results
// (executed sequentially, so, we need to see it sequentially from left to right)
const isCreateGroups = false
const groups = isCreateGroups ? [
  {id: "application components"},
  {id: "project components"},
] : null

export class TimelineChartManager extends XYChartManager {
  private lastData: InputData | null = null
  // private readonly dateAxis: am4charts.DateAxis

  constructor(container: HTMLElement) {
    super(container)

    const chart = this.chart

    const durationAxis = chart.xAxes.push(new am4charts.DurationAxis())
    durationAxis.durationFormatter.baseUnit = "millisecond"
    durationAxis.durationFormatter.durationFormat = "S"
    durationAxis.min = 0
    durationAxis.strictMinMax = true
    // durationAxis.renderer.grid.template.disabled = true

    const levelAxis = chart.yAxes.push(new am4charts.CategoryAxis())
    levelAxis.dataFields.category = "level"
    levelAxis.renderer.grid.template.location = 0
    levelAxis.renderer.minGridDistance = 1
    levelAxis.renderer.labels.template.disabled = true

    const series = chart.series.push(new am4charts.ColumnSeries())
    // series.columns.template.width = am4core.percent(80)
    series.columns.template.tooltipText = "{name}: {duration}"
    series.dataFields.openDateX = "start"
    series.dataFields.openValueX = "start"
    series.dataFields.dateX = "end"
    series.dataFields.valueX = "end"
    series.dataFields.categoryY = "level"

    // series.columns.template.propertyFields.fill = "color"
    // series.columns.template.propertyFields.stroke = "color";

    // series.columns.template.adapter.add("fill", (fill, target) => {
    //   return target.dataItem ? chart.colors.getIndex(target.dataItem.index) : fill
    // })
    series.columns.template.propertyFields.fill = "color"
    series.columns.template.propertyFields.stroke = "color"
    series.columns.template.strokeOpacity = 1

    const valueLabel = series.bullets.push(new am4charts.LabelBullet())
    valueLabel.label.text = "{name}"
    valueLabel.label.truncate = false
    valueLabel.label.hideOversized = false
    valueLabel.label.horizontalCenter = "left"
    // valueLabel.label.fill = am4core.color("#fff")
    valueLabel.locationX = 1
    // https://github.com/amcharts/amcharts4/issues/668#issuecomment-446655416
    valueLabel.interactionsEnabled = false
    // valueLabel.label.fontSize = 12

    const isUseRealTimeElement = document.getElementById("isUseRealTime")
    if (isUseRealTimeElement != null) {
      isUseRealTimeElement.addEventListener("click", () => {
        if (this.lastData != null) {
          this.render(this.lastData)
        }
      })
    }

    this.addHeightAdjuster(levelAxis)
  }

  private addHeightAdjuster(levelAxis: am4charts.Axis) {
    // https://www.amcharts.com/docs/v4/tutorials/auto-adjusting-chart-height-based-on-a-number-of-data-items/
    // noinspection SpellCheckingInspection
    this.chart.events.on("datavalidated", () => {
      const chart = this.chart
      const adjustHeight = chart.data.reduce((maxLevel, item) => Math.max(item.level, maxLevel), 0) * 35 - levelAxis.pixelHeight

      // get current chart height
      let targetHeight = chart.pixelHeight + adjustHeight

      // Set it on chart's container
      chart.svgContainer!!.htmlElement.style.height = targetHeight + "px"
    })
  }

  render(ijData: InputData) {
    this.lastData = ijData

    // const isUseRealTime = (document.getElementById("isUseRealTime") as HTMLInputElement).checked

    // noinspection ES6ModulesDependencies
    const firstStart = new Date(ijData.items[0].start)
    // hack to force timeline to start from 0
    // const timeOffset = isUseRealTime ? 0 : (firstStart.getSeconds() * 1000) + firstStart.getMilliseconds()
    const timeOffset = ijData.items[0].start

    const data = transformIjData(ijData, timeOffset)
    this.chart.data = data

    const originalItems = ijData.items
    const durationAxis = this.chart.xAxes.getIndex(0) as am4charts.DurationAxis
    // https://www.amcharts.com/docs/v4/concepts/axes/date-axis/
    // this.dateAxis.dateFormats.setKey("second", isUseRealTime ? "HH:mm:ss" : "s")
    // this.dateAxis.min = originalItems[0].start - timeOffset
    // this.dateAxis.max = originalItems[originalItems.length - 1].end - timeOffset
    durationAxis.max = originalItems[originalItems.length - 1].end - timeOffset
  }
}

function computeTitle(item: any, _index: number) {
  let result = item.name + (item.description == null ? "" : `<br/>${item.description}`) + `<br/>${item.duration} ms`
  // debug
  // result += `<br/>${index}`
  return result
}

function computeLevels(input: InputData) {
  let prevItem: Item | null = null
  let level = 0
  for (const item of input.items) {
    if (prevItem != null) {
      if (prevItem.end >= item.end) {
        level++
      }
    }
    (item as TimeLineItem).level = level
    prevItem = item
  }
}

function transformIjData(input: InputData, timeOffset: number): Array<any> {
  const colorSet = new am4core.ColorSet()
  const transformedItems = new Array<any>(input.items.length)

  computeLevels(input)

  // we cannot use actual level as row index because in this case labels will be overlapped, so,
  // row index simply incremented till empirical limit (6).
  let rowIndex = 0
  for (let i = 0; i < input.items.length; i++) {
    const item = input.items[i] as TimeLineItem

    const result: any = {
      name: item.name,
      start: item.start - timeOffset,
      end: item.end - timeOffset,
      duration: item.duration,
      // level: item.isSubItem ? 2 : 1
      // level: "l" + getLevel(i, input.items, transformedItems).toString(),
      // level: getLevel(i, input.items, transformedItems),
      // level: item.level,
      level: rowIndex++,
      color: colorSet.getIndex(item.level /* level from original item is correct */)
    }

    if (rowIndex > 6) {
      rowIndex = 0
    }
    transformedItems[i] = result
  }

  transformedItems.sort((a, b) => a.level - b.level)
  return transformedItems
}

interface TimeLineItem extends Item {
  level: number
}