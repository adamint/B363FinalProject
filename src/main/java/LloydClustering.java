import org.apache.commons.io.FileUtils;

import java.io.File;
import java.io.IOException;
import java.nio.charset.Charset;
import java.text.DecimalFormat;
import java.util.*;
import java.util.stream.Collectors;

public class LloydClustering {
    public static double euclideanDistance(List<Double> v, List<Double> w) {
        double sum = 0;
        for (int i = 0; i < v.size(); i++) sum += Math.pow(v.get(i) - w.get(i), 2);
        return sum;
    }

    public static List<Double> centerOfGravity(List<List<Double>> data) {
        List<Double> values = new ArrayList<>();
        for (int i = 0; i < data.get(0).size(); i++) {
            double pointSum = 0;
            for (int j = 0; j < data.size(); j++) pointSum += data.get(j).get(i);
            values.add(pointSum / data.size());
        }
        return values;
    }

    public static String lloydKMeansClustering(String string) {
        List<String> lines = Arrays.asList(string.split("\n"));
        int k = Integer.parseInt(lines.get(0).split(" ")[0]);
        int m = Integer.parseInt(lines.get(0).split(" ")[1]);
        lines = lines.subList(1, lines.size());

        List<List<Double>> points = lines
                .stream()
                .map(line -> Arrays.stream(line.split(" ")).map(Double::parseDouble).collect(Collectors.toList()))
                .collect(Collectors.toList());

        List<List<Double>> centers = new ArrayList<>(lloydKMeansClusteringAlgorithm(k, points).keySet());

        return centers.stream()
                .map(center -> center.stream().map(num -> new DecimalFormat("#.000").format(num)).collect(Collectors.joining(" ")))
                .collect(Collectors.joining("\n"));
    }

    public static Map<List<Double>, List<List<Double>>> lloydKMeansClusteringAlgorithm(int k, List<List<Double>> data) {
        List<List<Double>> clusterCenters = new ArrayList<>();
        while (true) {
            if (clusterCenters.isEmpty()) clusterCenters.addAll(data.subList(0, k));
            Map<List<Double>, List<List<Double>>> clusterDict = new HashMap<>();
            for (List<Double> center : clusterCenters) clusterDict.put(center, new ArrayList<>());
            for (List<Double> dataPoint : data) {
                List<Double> clusterDistances = clusterCenters.stream()
                        .map(center -> euclideanDistance(dataPoint, center))
                        .collect(Collectors.toList());
                int minIndex = 0;
                for (int i = 1; i < clusterCenters.size(); i++) {
                    if (clusterDistances.get(i) < clusterDistances.get(minIndex)) minIndex = i;
                }
                List<Double> closestCluster = clusterCenters.get(minIndex);
                clusterDict.get(closestCluster).add(dataPoint);
            }

            List<List<Double>> newClusterCenters = clusterCenters.stream()
                    .map(center -> centerOfGravity(clusterDict.get(center)))
                    .collect(Collectors.toList());

            if (newClusterCenters.equals(clusterCenters)) return clusterDict;
            else clusterCenters = newClusterCenters;
        }
    }

    public static void main(String[] args) throws IOException {
        File file = new File(LloydClustering.class.getClassLoader().getResource("test.txt").getPath());
        String input = FileUtils.readFileToString(file, Charset.defaultCharset());
        System.out.println(lloydKMeansClustering(input));
    }
}
