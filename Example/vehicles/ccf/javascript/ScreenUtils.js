angular.module('ScreenUtils', [])
.service('ScreenUtils', function () {
  this.svgDimensions = {
    fromX:0, fromY:0, toX: 0, toY: 0
  }; var svgDimensions = this.svgDimensions;

  this.pxToSVG = (inp = {x:0, y:0}, mulOff = {x:0, y:0}) => {
    return {
      x: Number(inp.x) * (svgDimensions.toX/svgDimensions.fromX + mulOff.x),
      y: Number(inp.y) * (svgDimensions.toY/svgDimensions.fromY + mulOff.y)}
  }

  this.YpxToSVG = (inp = 0, mulOff = 0) => {
    return Number(inp) * (svgDimensions.toY/svgDimensions.fromY + mulOff)
  }

  this.XpxToSVG = (inp = 0, mulOff = 0) => {
    return Number(inp) * (svgDimensions.toX/svgDimensions.fromX + mulOff)
  }

  this.fixClock = (v, fill="0") => {
    return (v<10)? fill+v : v;
  }

  this.limitVal = (min, val,max) => {
    return Math.min(Math.max(min,val), max);
  }

  this.addText = (obj, txt, style) => {
    obj.n.innerHTML = ""
    var textStyle = style || {"font-size":"2.01961px","line-height":"0.85","font-family":"Nasalization","font-variant-ligatures":"none","text-align":"center","text-anchor":"middle","fill":"#ffffff","stroke-width":"0.168301"}
    var textLines = txt.split("\n")
    var lineHeight = Number(textStyle["font-size"].replace("px", ""))*(textStyle["line-height"] || 1)
    var fullSize = lineHeight*(textLines.length-1)
    for (var key in textLines) {
      var ts = hu('<tspan>', obj)
      .attr({x:obj.n.getAttribute("x"), y:Number(obj.n.getAttribute("y"))+lineHeight*Number(key)-fullSize/2})
      .text(textLines[key])
      .css(textStyle);
    }
  }
})