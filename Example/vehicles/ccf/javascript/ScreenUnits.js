angular.module('ScreenUnits', [])
.service('ScreenUnits', function () {
  this.uiUnits = {
    'uiUnitLength':          'metric',
    'uiUnitTemperature':     'f',
    'uiUnitWeight':          'lb',
    'uiUnitConsumptionRate': 'imperial',
    'uiUnitTorque':          'imperial',
    'uiUnitEnergy':          'imperial',
    'uiUnitDate':            'us',
    'uiUnitPower':           'bhp',
    'uiUnitVolume':          'gal',
    'uiUnitPressure':        'psi'
  }

  this.mapping = {
    'length':          'uiUnitLength',
    'speed':           'uiUnitLength',
    'temperature':     'uiUnitTemperature',
    'weight':          'uiUnitWeight',
    'consumptionRate': 'uiUnitConsumptionRate',
    'torque':          'uiUnitTorque',
    'energy':          'uiUnitEnergy',
    'date':            'uiUnitDate',
    'power':           'uiUnitPower',
    'volume':          'uiUnitVolume',
    'pressure':        'uiUnitPressure',
    'lengthMinor':     'uiUnitLength',
  }

  this.settingsChanged = (data) => {
    for (let i in this.uiUnits) {
      if (data[i] !== undefined) {
        this.uiUnits[i] = data[i]
      }
    }
  }

  this.buildString = (func, val, numDecs, system) => {
    if (func === 'division' || func === 'buildString' || func === 'date' || typeof this[func] !== 'function') {
      //console.log(arguments)
      throw new Error('Cannot use this function to build a string')
    }

    if (this.mapping[func] !== undefined && system === undefined) {
      system = this.uiUnits[this.mapping[func]]
    }

    let helper = this[func](val, system)
    if (helper !== null) {
      if(typeof helper.val === 'string') {
        return helper.val
      } else if(typeof helper.val === 'number')  {
        return helper.val.toFixed(numDecs) + ' ' + helper.unit
      } else {
        //console.error('got invalid reply', arguments)
        return ''
      }
    } else {
      //console.error('got null', arguments)
      return ''
    }
  }

  this.division = (func1, func2, val1, val2, numDecs, system1, system2) => {
    if ((func1 === 'division' || func1 === 'weightPower' || func1 === 'buildString' || func1 === 'date' || typeof this[func1] !== 'function'
      && func2 === 'division' || func2 === 'weightPower' || func2 === 'buildString' || func2 === 'date' || typeof this[func2] !== 'function')) {
      //console.log(arguments)
      throw new Error('Cannot use these functions')
    }

    let helper1 = this[func1](val1, system1)
    let helper2 = this[func2](val2, system2)

    if (helper1 !== null && helper2 !== null) {
      let newVal = helper1.val / helper2.val
      return {
        val: (numDecs !== undefined ? Utils.roundDec(newVal) : newVal),
        unit: `${helper1.unit}/${helper2.unit}`
      }
    } else {
      console.error('got null', arguments)
      return null
    }
  }

  this.weightPower = (x) => {
    let helper = this.division('weight', 'power', 1, 1)

    if (helper !== null) {
      return {
        val: helper.val * x,
        unit: helper.unit
      }
    } else {
      return null
    }
  }

  this.length = (meters, system = this.uiUnits.uiUnitLength) => {
    if (system === 'metric') {
      if     (meters < 0.01) return { val: meters * 1000, unit: 'mm'}
      else if(meters < 1)    return { val: meters * 100, unit: 'cm'}
      else if(meters < 1000) return { val: meters, unit: 'm'}
      else return { val: meters * 0.001, unit: 'km'}
    } else if (system === 'imperial') {
      let yd = meters * 1.0936
      if     (yd < 1)    return { val: yd * 36, unit: 'in'}
      else if(yd < 3)    return { val: yd * 3, unit: 'ft'}
      else if(yd < 1760) return { val: yd, unit: 'yd'}
      else return { val: yd * 0.000568182, unit: 'mi'}
    }
    return null
  }

  this.lengthMinor = (meters, system = this.uiUnits.uiUnitLength) => {
    if (system === 'metric') {
      return { val: meters * 1, unit: 'm'}
    } else if (system === 'imperial') {
      return { val: meters * 1.0936 * 3, unit: 'ft'}
    }
    return null
  }

  this.area = (squareMeters, system = this.uiUnits.uiUnitLength) => {
    if(system === 'metric') {
      if(squareMeters < 1000) return { val: squareMeters, unit: 'sq m'}
      else return { val: squareMeters * 0.001 * 0.001, unit: ' sq km'}
    } else if (system === 'imperial') {
      let sqrYards = squareMeters * 1.0936 * 1.0936
      if(sqrYards < 1760) return { val: sqrYards, unit: 'sq yd'}
      else return { val: sqrYards * 0.000568182 * 0.000568182, unit: 'sq mi'}
    }
    return null
  }

  this.temperature = (x, system = this.uiUnits.uiUnitTemperature) => {
    switch (system) {
      case 'c': return { val: x,            unit: '°C' }
      case 'f': return { val: x * 1.8 + 32, unit: '°F' }
      case 'k': return { val: x + 273.15,   unit: 'K' }
      default: return null
    }
  }

  this.volume = (x, system = this.uiUnits.uiUnitVolume) => {
    switch (system) {
      case 'l':   return { val: x,          unit: 'L' }
      case 'gal': return { val: x * 0.2642, unit: 'gal' }
      default: return null
    }
  }

  this.pressure = (x, system = this.uiUnits.uiUnitPressure) => {
    switch (system) {
      case 'inHg': return { val: x * 0.2953, unit: 'in.Hg' }
      case 'bar':  return { val: x * 0.01, unit: 'Bar' }
      case 'psi':  return { val: x * 0.145038, unit: 'PSI' }
      case 'kPa':  return { val: x, unit: 'kPa' }
      default: return null
    }
  }

  this.weight = (x, system = this.uiUnits.uiUnitWeight) => {
    switch (system) {
      case 'kg': return {val: x,              unit: 'kg'  }
      case 'lb': return {val: 2.20462262 * x, unit: 'lbs' }
      default: return null
    }
  }

  this.consumptionRate = (x, system = this.uiUnits.uiUnitConsumptionRate) => {
    switch (system) {
      case 'metric':   return {val: ( 1e+5 * x > 50000 ) ? 'n/a' : 1e+5 * x, unit: 'L/100km' }
      case 'imperial': return {val: (x === 0 ? 0 : 235 * 1e-5 / x)         , unit: 'MPG'}
      default: return null
    }
  }

  this.speed = (x, system = this.uiUnits.uiUnitLength) => {
    switch (system) {
      case 'metric':   return { val: 3.6 * x,        unit: 'km/h' }
      case 'imperial': return { val: 2.23693629 * x, unit: 'mph'  }
      default: return null
    }
  }

  this.power = (x, system = this.uiUnits.uiUnitPower) => {
    switch (system) {
      case 'kw':   return { val: 0.735499 * x, unit: 'kW' }
      case 'hp':   return { val: x, unit: 'PS' }
      case 'bhp': return { val: 0.98632 * x, unit: 'bhp' }
      default: return null
    }
  }

  this.torque = (x, system = this.uiUnits.uiUnitTorque) => {
    if(system === 'metric') system = 'kg'
    else if(system === 'imperial') system = 'lb'
    switch (system) {
      case 'kg': return {val: x,              unit: 'Nm'}
      case 'lb': return {val: 0.7375621495*x, unit: 'lb-ft'}
      default: return null
    }
  }

  this.energy = (x, system = this.uiUnits.uiUnitEnergy) => {
    if(system === 'metric') system = 'j'
    else if(system === 'imperial') system = 'ft lb'
    switch (system) {
      case 'j':     return {val: x,              unit: 'J'   }
      case 'ft lb': return {val: 0.7375621495*x, unit: 'ft lb'}
      default: return null
    }
  }

  this.date = (x, system = this.uiUnits.uiUnitDate) => {
    switch (system) {
      case 'ger': return x.toLocaleDateString('de-DE')
      case 'uk':  return x.toLocaleDateString('en-GB')
      case 'us':  return x.toLocaleDateString('en-US')
      default: return null
    }
  }

  this.beamBucks = (x) => {
    return Intl.NumberFormat("en-US", {
      style: "decimal",
      maximumFractionDigits:2,
      minimumFractionDigits:2
    }).format(+x)
  }
})