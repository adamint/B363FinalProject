package bioinformatics.yeast;

import bioinformatics.Motifs;
import bioinformatics.Utils;
import org.apache.commons.io.FileUtils;
import org.jsoup.Jsoup;

import java.io.IOException;
import java.util.*;
import java.util.concurrent.Executor;
import java.util.concurrent.Executors;
import java.util.concurrent.atomic.AtomicInteger;
import java.util.regex.Matcher;
import java.util.regex.Pattern;
import java.util.stream.Collectors;

public class GeneSequenceParser {
    public static String csrePattern = "CATTCATCCG";

    static String oppositeDnaSequence(String dna) {
        StringBuilder newDna = new StringBuilder();
        for (int i = 0; i < dna.length(); i++) {
            char c = dna.charAt(i);
            if (c == 'A') newDna.append('T');
            else if (c == 'T') newDna.append('A');
            else if (c == 'G') newDna.append('C');
            else newDna.append('G');
        }
        return newDna.toString();
    }

    public static String reversed(String s) {
        StringBuilder newDna = new StringBuilder();
        for (int i = s.length() - 1; i >= 0; i--) newDna.append(s.charAt(i));
        return newDna.toString();
    }

    public static void main(String[] args) throws IOException, InterruptedException {
        Map<String, String> geneSequenceMap = new HashMap<>();
        YeastGenome genome = new YeastGenome();
        genome.filterGenes(1.5);

        AtomicInteger numCompleted = new AtomicInteger(0);
        Executor executor = Executors.newCachedThreadPool();
        Pattern geneHrefPattern = Pattern.compile("/db_xref=\"GeneID:<a href=\"(.+)\">");
        List<String> chromosomeFiles = new ArrayList<>();
        for (int i = 1; i <= 17; i++) chromosomeFiles.add(Utils.readResource("chromosome" + i + ".htm"));
        List<List<String>> urlsByChromosome = chromosomeFiles.stream().map(fileText -> {
            List<String> urls = new ArrayList<>();
            Matcher geneIdMatcher = geneHrefPattern.matcher(fileText);
            while (geneIdMatcher.find()) {
                urls.add(geneIdMatcher.group(1));
            }
            return urls;
        }).collect(Collectors.toList());

        Set<String> allUrls = new HashSet<>();
        for (List<String> chromosomeUrls : urlsByChromosome) allUrls.addAll(chromosomeUrls);

        Pattern dlIdPattern = Pattern.compile("<meta name=\"ncbi_uidlist\" content=\"(.+)\"");
        Pattern geneNamePattern = Pattern.compile("<span>sce:(.+)</span>");
        Pattern fromPattern = Pattern.compile("from=(.+)&amp;to");
        Pattern toPattern = Pattern.compile("to=(.+)(&amp;)?");
        Pattern nucleotideFastaReportPattern = Pattern.compile("Nucleotide FASTA report\" href=\"(.+)\" ref=.+FASTA");
        String baseUrl = "https://www.ncbi.nlm.nih.gov";

        // https://www.ncbi.nlm.nih.gov/sviewer/viewer.cgi?tool=portal&save=file&log$=seqview
        // &db=nuccore&report=fasta
        // &id=330443482&from=257112&to=257975&strand=on&extrafeat=null&conwithfeat=on&hide-cdd=on

        String userAgent = "Mozilla/5.0 (Macintosh; Intel Mac OS X 11_0_1) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/87.0.4280.67 Safari/537.36 Edg/87.0.664.55";
        for (String url : new ArrayList<>(allUrls)) {
            Thread.sleep(25);
            executor.execute(() -> {
                try {
                    //System.out.println(url);
                    String html = Jsoup.connect(url).userAgent(userAgent).get().html();
                    Matcher reportMatcher = nucleotideFastaReportPattern.matcher(html);
                    reportMatcher.find();
                    String reportUrl = baseUrl + reportMatcher.group(1);
                    //System.out.println(html);
                    Matcher geneNameMatcher = geneNamePattern.matcher(html);
                    geneNameMatcher.find();
                    String geneName = geneNameMatcher.group(1);

                    if (!genome.getGenes().stream().anyMatch(yeastGene -> yeastGene.getGene().equals(geneName))) {
                        return;
                    }

                    System.out.println("Looking at significant change gene " + geneName);

                    //System.out.println(geneName);
                    //System.out.println(reportUrl);

                    String reportHtml = Jsoup.connect(reportUrl).userAgent(userAgent).ignoreHttpErrors(true).get().html();
                    //System.out.println(reportHtml);
                    Matcher dlIdMatcher = dlIdPattern.matcher(reportHtml);
                    dlIdMatcher.find();
                    String dlId = dlIdMatcher.group(1);
                    Matcher fromMatcher = fromPattern.matcher(reportUrl);
                    fromMatcher.find();
                    String from = fromMatcher.group(1);
                    Matcher toMatcher = toPattern.matcher(reportUrl);
                    toMatcher.find();
                    String to = toMatcher.group(1);
                    // System.out.println(dlId);
                    // System.out.println(to);
                    // System.out.println(from);

                    String downloadUrl =
                            "https://www.ncbi.nlm.nih.gov/sviewer/viewer.cgi?tool=portal&save=file&log$=seqview&db=nuccore&report=fasta" +
                                    "&id=" + dlId + "&from=" + from + "&to=" + to + "&strand=on&extrafeat=null&conwithfeat=on&hide-cdd=on";

                    String fastaFile = Jsoup.connect(downloadUrl).userAgent(userAgent).get().body().html();
                    String sequenceUnparsed = fastaFile.split("complete sequence ")[1];
                    List<String> sequencePieces = Arrays.asList(sequenceUnparsed.split("[\\n\\s]+"));
                    String sequence = sequencePieces
                            .stream().map(String::trim)
                            .collect(Collectors.joining(""));
                    //System.out.println(sequence);
                    geneSequenceMap.putIfAbsent(geneName, sequence);

                    boolean found = false;
                    for (String kmer : Motifs.generateKmers(sequence, csrePattern.length())) {
                        if (
                                Motifs.calculateHammingDistance(kmer, csrePattern) <= 1
                                || Motifs.calculateHammingDistance(kmer, reversed(csrePattern)) <= 1
                                || Motifs.calculateHammingDistance(kmer, oppositeDnaSequence(csrePattern)) <= 1

                        ) {
                            System.out.println("CSRE is found in gene " + geneName + "\nSequence:" + sequence + "\nKmer: " + kmer);
                            System.out.println("(completed " + numCompleted.get() + " so far)");
                            System.out.println("significant change? " + genome.getGenes().stream().anyMatch(yeastGene -> yeastGene.getGene().equals(geneName)));
                            found = true;
                            break;
                        }
                    }
                      if (!found) System.out.println("CSRE not found in gene " + geneName);
                    System.out.println(numCompleted.incrementAndGet());
                } catch (Exception e) {
                    e.printStackTrace();
                }
            });
        }

        System.out.println("gene sequence mappings:\n\n\n\n");
        List<String> entries = new ArrayList<>();
        for (String gene : geneSequenceMap.keySet()) {
            entries.add(gene + " | " + geneSequenceMap.get(gene));
        }
        String text = String.join("\n", entries);
        System.out.println(text);
        // download url =
        // https://www.ncbi.nlm.nih.gov/sviewer/viewer.cgi?tool=portal&save=file&log$=seqview&db=nuccore&report=fasta&id=330443743&from=585&to=740&extrafeat=null&conwithfeat=on&hide-cdd=on


    }
}
