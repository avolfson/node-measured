/**
 * Simple registry that stores Metrics by name and dimensions.
 */
class DimensionAwareMetricsRegistry {
  constructor() {
    this._metrics = {};
  }

  /**
   * Checks to see if a metric with the given name and dimensions is present.
   *
   * @param {string} name The metric name
   * @param {Dimensions} dimensions The dimensions for the metric
   * @returns {boolean} true if the metric with given dimensions is present
   */
  hasMetric(name, dimensions) {
    const key = this._generateStorageKey(name, dimensions);
    return Object.prototype.hasOwnProperty.call(this._metrics, key);
  }

  /**
   * Retrieves a metric with a given name and dimensions is present.
   *
   * @param {string} name The metric name
   * @param {Dimensions} dimensions The dimensions for the metric
   * @returns {Metric} a wrapper object around name, dimension and {@link Metric}
   */
  getMetric(name, dimensions) {
    const key = this._generateStorageKey(name, dimensions);
    return this._metrics[key].metricImpl;
  }

  /**
   * Retrieves a metric by the calculated key (name / dimension combo).
   *
   * @param {string} key The registered key for the given registered {@link MetricWrapper}
   * @returns {MetricWrapper} a wrapper object around name, dimension and {@link Metric}
   */
  getMetricWrapperByKey(key) {
    return this._metrics[key];
  }

  /**
   * Upserts a {@link Metric} in the internal storage map for a given name, dimension combo
   *
   * @param {string} name The metric name
   * @param {Metric} metric The {@link Metric} impl
   * @param {Dimensions} dimensions The dimensions for the metric
   * @return {string} The registry key for the metric, dimension combo
   */
  putMetric(name, metric, dimensions) {
    const key = this._generateStorageKey(name, dimensions);
    this._metrics[key] = {
      name: name,
      metricImpl: metric,
      dimensions: dimensions || {}
    };
    return key;
  }

  /**
   * Returns an array of all keys of metrics stored in this registry.
   * @return {string[]} all keys of metrics stored in this registry.
   */
  allKeys() {
    return Object.keys(this._metrics);
  }

  /**
   * Generates a unique key off of the metric name and custom dimensions for internal use in the registry maps.
   *
   * @param {string} name The metric name
   * @param {Dimensions} dimensions The dimensions for the metric
   * @return {string} a unique key based off of the metric nae and dimensions
   * @private
   */
  _generateStorageKey(name, dimensions) {
    let key = name;
    if (dimensions) {
      Object.keys(dimensions)
        .sort()
        .forEach(dimensionKey => {
          key = `${key}-${dimensions[dimensionKey]}`;
        });
    }
    return key;
  }
}

module.exports = DimensionAwareMetricsRegistry;
