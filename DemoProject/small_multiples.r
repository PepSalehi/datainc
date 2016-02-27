combined <- read.csv("C:/Users/Peyman.n/Dropbox/data incubator/flights/combined.csv", stringsAsFactors=FALSE, header = TRUE)
head(combined)
head(combined$DEST_CITY_NAME)

sample_dest <- "MA" #combined$DEST_CITY_NAME[1]

combined[, 'ARR_DELAY']

combined %>% filter(DEST_CITY_NAME == sample_dest) %>%  filter(!is.na(ARR_DELAY)) %>% group_by(CARRIER) %>% select(c(ARR_DELAY, CARRIER))

delays_for_sample_dest <- combined %>% filter(DEST_CITY_NAME == sample_dest) %>%  filter(!is.na(ARR_DELAY)) %>% select(c(ARR_DELAY, CARRIER))


temp <-  combined %>% filter(ORIGIN_STATE_ABR == sample_dest) %>%  filter(!is.na(ARR_DELAY)) %>% group_by(CARRIER) 
# %>% 
#   select(c(ARR_DELAY, CARRIER)) 

carriers <- unique(temp$CARRIER)

par(mfrow=c(5,3), mar=c(2,2,4,1))
for (i in carriers){
  delays <- temp %>% filter(CARRIER == i) %>% .$ARR_DELAY
  d = density(delays)
  plot(d, main= i , cex.main=1.5, cex.axis=1, border="white", col="#cccccc",space=0, axes=FALSE, xlim=c(-100,200), 
       ylim= c(0, .041), yaxs="i") # , bty="n"
  polygon(d, col="#e26b43", border="white", ylim= c(0, .031))
  # Draw custom axes
  axis(side=1, at=c(seq(-100, 400, 100)), labels=TRUE)
  axis(side=2, at=c(0,.01,.02,.03), cex=0.7)
  abline(v= quantile(delays, .9) )
  mtext(paste0("90th percentile delay is ", round(quantile(delays, .9)) ," mins"))
}

