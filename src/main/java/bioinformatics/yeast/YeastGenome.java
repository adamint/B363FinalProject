package bioinformatics.yeast;

import bioinformatics.LloydClustering;
import bioinformatics.Utils;
import org.knowm.xchart.SwingWrapper;
import org.knowm.xchart.XYChart;
import org.knowm.xchart.XYChartBuilder;
import org.knowm.xchart.XYSeries;
import org.knowm.xchart.style.Styler;

import java.util.ArrayList;
import java.util.Arrays;
import java.util.List;
import java.util.Map;
import java.util.regex.Matcher;
import java.util.regex.Pattern;
import java.util.stream.Collectors;

public class YeastGenome {
    private List<YeastGene> genes;

    public YeastGenome() {
        Pattern linePattern = Pattern.compile("^\\d+\\t([^\\s]+)\\s((.+)\\t)*\\t*(.+)\\t(.+)\\t(.+)\\t(.+)\\t(.+)\\t(.+)\\t(.+)");
        String yeastGeneExpressionFile = Utils.readResource("yeast-gene-expressions.txt");
        assert yeastGeneExpressionFile != null;
        List<String> lines = Arrays.asList(yeastGeneExpressionFile.split("\n"));
        this.genes = lines.subList(1, lines.size()).stream().map(line -> {
            Matcher matcher = linePattern.matcher(line);
            matcher.find();
            String gene = matcher.group(1);
            String standardName = matcher.group(3);
            List<Double> expressions = new ArrayList<>();
            for (int i = 4; i <= 10; i++) expressions.add(Double.parseDouble(matcher.group(i)));
            return new YeastGene(gene, standardName, expressions);
        }).collect(Collectors.toList());
    }

    public static double calculateSSE(Map<List<Double>, List<List<Double>>> clusters) {
        double sse = 0;
        for (Map.Entry<List<Double>, List<List<Double>>> cluster : clusters.entrySet()) {
            List<Double> clusterCenter = cluster.getKey();
            List<List<Double>> clusterPoints = cluster.getValue();
            for (List<Double> point : clusterPoints) {
                sse += Math.pow(LloydClustering.euclideanDistance(clusterCenter, point), 2.0);
            }
        }
        return sse;
    }

    public static void main(String[] args) {
        YeastGenome yeastGenome = new YeastGenome();
        yeastGenome.filterGenes(2.2);
        List<List<Double>> data = yeastGenome.getGenes().stream().map(YeastGene::getExpressionsLog).collect(Collectors.toList());

        XYChart kChart = new XYChartBuilder().width(600).height(400).title("k SSEs").xAxisTitle("k").yAxisTitle("SSE").build();
        kChart.getStyler().setDefaultSeriesRenderStyle(XYSeries.XYSeriesRenderStyle.Line);
        kChart.getStyler().setChartTitleVisible(false);
        kChart.getStyler().setLegendPosition(Styler.LegendPosition.InsideNE);

        List<Double> sses = new ArrayList<>();
        List<Integer> ks = new ArrayList<>();
        for (int i = 1; i <= 15; i++) {
            Map<List<Double>, List<List<Double>>> clustersToTest = LloydClustering.lloydKMeansClusteringAlgorithm(i, data);
            sses.add(calculateSSE(clustersToTest));
            ks.add(i);
        }

        kChart.addSeries("SSEs", ks, sses);
        new SwingWrapper(kChart).displayChart();


        int bestClusterNum = 6;
        Map<List<Double>, List<List<Double>>> bestClusters = LloydClustering.lloydKMeansClusteringAlgorithm(bestClusterNum, data);
        System.out.println("Best estimate for proper k (using elbow method) is " + bestClusterNum + " with SSE of " + calculateSSE(bestClusters));


        Map<List<Double>, List<List<Double>>> clusters = bestClusters;

        XYChart pointsChart = new XYChartBuilder().width(600).height(400).title("Gene Expressions").xAxisTitle("Time after dia.").yAxisTitle("Expression").build();

        pointsChart.getStyler().setDefaultSeriesRenderStyle(XYSeries.XYSeriesRenderStyle.Line);
        pointsChart.getStyler().setChartTitleVisible(false);
        pointsChart.getStyler().setLegendPosition(Styler.LegendPosition.InsideSW);

        int index = 0;
        for (List<Double> point : data) {
            pointsChart.addSeries("Point " + index, Arrays.asList(-6, -4, -2, 0, 2, 4, 6), point);
            index++;
        }

        new SwingWrapper(pointsChart).displayChart();


        XYChart clustersChart = new XYChartBuilder().width(600).height(400).title("Gene Expressions (Clusters)").xAxisTitle("Time after dia.").yAxisTitle("Expression").build();
        clustersChart.getStyler().setDefaultSeriesRenderStyle(XYSeries.XYSeriesRenderStyle.Line);
        clustersChart.getStyler().setChartTitleVisible(false);
        clustersChart.getStyler().setLegendPosition(Styler.LegendPosition.InsideSW);

        index = 0;
        for (Map.Entry<List<Double>, List<List<Double>>> cluster : clusters.entrySet()) {
            List<Double> clusterCenter = cluster.getKey();
            List<List<Double>> clusteredPoints = cluster.getValue();
            clustersChart.addSeries("Cluster " + index + " (check console for mapping)", Arrays.asList(-6, -4, -2, 0, 2, 4, 6), clusterCenter);
            System.out.println("====\nCluster " + index + " maps to the following points:");
            for (int i = 0; i < clusteredPoints.size(); i++) {
                List<Double> point = clusteredPoints.get(i);
                System.out.println("" + i + ": " + point.stream().map(Object::toString).collect(Collectors.joining(" ")));
            }
            index++;
        }

        new SwingWrapper(clustersChart).displayChart();

        System.out.println("=======");
        index = 0;
        int numIncreasing = 0;
        for (Map.Entry<List<Double>, List<List<Double>>> cluster : clusters.entrySet()) {
            List<Double> clusterCenter = cluster.getKey();
            if (clusterCenter.get(clusterCenter.size() - 1) > 0) { // trends upwards
                System.out.println("Genes in cluster " + index + " " + clusterCenter + " show increasing expression levels after diauxic shift. These genes are below: ");
                for (List<Double> clusteredPoint : cluster.getValue()) {
                    numIncreasing++;
                    YeastGene gene = yeastGenome.getGenes().stream().filter(g -> g.getExpressionsLog().equals(clusteredPoint)).findFirst().get();
                    double start = clusteredPoint.get(0);
                    double end = clusteredPoint.get(clusteredPoint.size() - 1);

                    System.out.println(gene.getGene() + ": " + start + " -> " + end);
                }
            }
            index++;
        }
        System.out.println("\n\nNumber of genes increasing: " + numIncreasing);

    }

    // filter out genes who don't change more than deltaChange
    public void filterGenes(double deltaChange) {
        genes = genes.stream().filter(gene -> gene.doesSignificantlyChange(deltaChange)).collect(Collectors.toList());
    }

    public List<YeastGene> getGenes() {
        return genes;
    }
}
